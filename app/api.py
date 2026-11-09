import datetime
import json

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from . import db, llm, security

router = APIRouter()


def uid_of(authorization: str | None) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "not logged in")
    uid = security.parse_token(authorization[7:])
    if not uid:
        raise HTTPException(401, "invalid token")
    return uid


class AuthIn(BaseModel):
    username: str = Field(min_length=2, max_length=24)
    password: str = Field(min_length=6, max_length=64)


class LogIn(BaseModel):
    fam: str
    word: str = Field(min_length=1, max_length=12)
    intensity: int = Field(ge=1, le=5)
    triggers: list[str] = Field(default_factory=list, max_length=10)
    note: str = Field(default="", max_length=500)


class HistoryItem(BaseModel):
    role: str = "user"
    content: str = Field(default="", max_length=1000)
    image: str | None = Field(default=None, max_length=1_400_000)  # base64 jpeg ≤ ~1MB


class ChatIn(BaseModel):
    history: list[HistoryItem] = Field(max_length=40)
    fam: str = Field(default="", max_length=12)
    word: str = Field(default="", max_length=12)


class LetterIn(BaseModel):
    text: str = Field(min_length=1, max_length=120)


def row_to_log(r) -> dict:
    return {
        "id": r["id"], "fam": r["fam"], "word": r["word"], "intensity": r["intensity"],
        "triggers": json.loads(r["triggers"]), "note": r["note"],
        "ai_response": json.loads(r["ai_response"]), "crisis": bool(r["crisis"]),
        "created_at": r["created_at"],
    }


# ---------- auth ----------

@router.post("/auth/register")
def register(body: AuthIn):
    with db.conn() as c:
        try:
            cur = c.execute(
                "INSERT INTO users(username,password,created_at) VALUES(?,?,?)",
                (body.username, security.hash_password(body.password), db.now()),
            )
        except Exception:
            raise HTTPException(400, "这个昵称已经被住下了，换一个试试")
        return {"token": security.make_token(cur.lastrowid), "username": body.username}


@router.post("/auth/login")
def login(body: AuthIn):
    with db.conn() as c:
        r = c.execute("SELECT * FROM users WHERE username=?", (body.username,)).fetchone()
        if not r or not security.verify_password(body.password, r["password"]):
            raise HTTPException(401, "昵称或密码不对哦")
        return {"token": security.make_token(r["id"]), "username": body.username}


class PwIn(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=64)


@router.post("/auth/change-password")
def change_password(body: PwIn, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    with db.conn() as c:
        r = c.execute("SELECT password FROM users WHERE id=?", (uid,)).fetchone()
        if not r or not security.verify_password(body.old_password, r["password"]):
            raise HTTPException(400, "现在的密码不对哦")
        c.execute("UPDATE users SET password=? WHERE id=?", (security.hash_password(body.new_password), uid))
    return {"ok": True}


@router.get("/me")
def me(authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    with db.conn() as c:
        u = c.execute("SELECT username, created_at FROM users WHERE id=?", (uid,)).fetchone()
        n = c.execute("SELECT COUNT(*) n FROM mood_logs WHERE user_id=?", (uid,)).fetchone()["n"]
    return {"username": u["username"], "logs": n, "since": u["created_at"]}


# ---------- mood logs ----------

@router.get("/logs")
def list_logs(limit: int = 20, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    limit = max(1, min(limit, 60))
    with db.conn() as c:
        rows = c.execute(
            "SELECT * FROM mood_logs WHERE user_id=? ORDER BY created_at DESC LIMIT ?",
            (uid, limit),
        ).fetchall()
    return [row_to_log(r) for r in rows]


@router.post("/logs")
async def create_log(body: LogIn, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    if body.fam not in db.FAMS:
        raise HTTPException(400, "unknown fam")
    response, crisis = await llm.gen_response(body.fam, body.word, body.intensity, body.triggers, body.note)
    with db.conn() as c:
        cur = c.execute(
            "INSERT INTO mood_logs(user_id,fam,word,intensity,triggers,note,ai_response,crisis,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?)",
            (uid, body.fam, body.word, body.intensity,
             json.dumps(body.triggers, ensure_ascii=False), body.note,
             json.dumps(response, ensure_ascii=False), int(crisis), db.now()),
        )
        r = c.execute("SELECT * FROM mood_logs WHERE id=?", (cur.lastrowid,)).fetchone()
    return row_to_log(r)


@router.delete("/logs/{log_id}")
def delete_log(log_id: int, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    with db.conn() as c:
        c.execute("DELETE FROM mood_logs WHERE id=? AND user_id=?", (log_id, uid))
    return {"ok": True}


# ---------- chat（聊两句） ----------

@router.post("/chat")
async def chat(body: ChatIn, authorization: str | None = Header(None)):
    uid_of(authorization)
    if body.fam and body.fam not in db.FAMS:
        raise HTTPException(400, "unknown fam")
    history = [m.model_dump() for m in body.history]
    reply, crisis = await llm.gen_reply(history, body.fam, body.word)
    proposal = None
    last_user = next((m for m in reversed(history) if m["role"] == "user"), None)
    explicit = last_user and "记下来" in (last_user.get("content") or "")
    user_count = len([m for m in history if m["role"] == "user"])
    if not crisis and (explicit or user_count >= 2):
        proposal = await llm.extract_mood(history)
    return {"reply": reply, "crisis": crisis, "proposal": proposal}


# ---------- letters（给明天的我） ----------

@router.get("/letters")
def list_letters(authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    with db.conn() as c:
        rows = c.execute(
            "SELECT id, text, created_at FROM letters WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
            (uid,),
        ).fetchall()
    return [{"id": r["id"], "text": r["text"], "created_at": r["created_at"]} for r in rows]


@router.post("/letters")
def create_letter(body: LetterIn, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    with db.conn() as c:
        cur = c.execute(
            "INSERT INTO letters(user_id,text,created_at) VALUES(?,?,?)",
            (uid, body.text, db.now()),
        )
        r = c.execute("SELECT id,text,created_at FROM letters WHERE id=?", (cur.lastrowid,)).fetchone()
    return {"id": r["id"], "text": r["text"], "created_at": r["created_at"]}


# ---------- stats ----------

def _days_back(n: int) -> list[str]:
    today = datetime.datetime.now(db.TZ).date()
    return [(today - datetime.timedelta(days=i)).isoformat() for i in range(n - 1, -1, -1)]


def _curve_value(fam: str, intensity: int) -> float:
    # 曲线高度 = 效价（上晴下雨），幅度随强度：i=1 → ±0.3，i=5 → ±0.9
    return db.FAMS[fam]["val"] * (0.15 + 0.15 * intensity)


@router.get("/stats")
def stats(days: int = 14, authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    days = max(7, min(days, 90))
    since = (datetime.datetime.now(db.TZ).date() - datetime.timedelta(days=days - 1)).isoformat()
    with db.conn() as c:
        rows = c.execute(
            "SELECT * FROM mood_logs WHERE user_id=? AND created_at>=? ORDER BY created_at",
            (uid, since),
        ).fetchall()
    by_day: dict[str, list] = {}
    for r in rows:
        by_day.setdefault(r["created_at"][:10], []).append(r)

    curve, rainbow, dist, trig_cnt = [], [], {k: 0 for k in db.FAMS}, {}
    for d in _days_back(days):
        logs = by_day.get(d, [])
        if logs:
            last = logs[-1]
            curve.append({"date": d[5:], "fam": last["fam"], "val": round(_curve_value(last["fam"], last["intensity"]), 2), "word": last["word"]})
        else:
            curve.append({"date": d[5:], "fam": None, "val": 0, "word": None})
    for d in _days_back(7):
        logs = by_day.get(d, [])
        rainbow.append({"date": d, "fam": logs[-1]["fam"] if logs else None, "word": logs[-1]["word"] if logs else None})
    for r in rows:
        dist[r["fam"]] += 1
        for t in json.loads(r["triggers"]):
            top = trig_cnt.setdefault(t, {"count": 0, "fams": {}})
            top["count"] += 1
            top["fams"][r["fam"]] = top["fams"].get(r["fam"], 0) + 1
    triggers = sorted(trig_cnt.items(), key=lambda kv: -kv[1]["count"])[:5]
    return {
        "curve": curve, "rainbow": rainbow, "dist": dist,
        "triggers": [{"name": t, "count": v["count"], "main_fam": max(v["fams"], key=v["fams"].get)} for t, v in triggers],
        "streak_days": len([d for d in by_day if by_day[d]]),
    }


@router.get("/weekly")
async def weekly(authorization: str | None = Header(None)):
    uid = uid_of(authorization)
    since = (datetime.datetime.now(db.TZ).date() - datetime.timedelta(days=6)).isoformat()
    with db.conn() as c:
        rows = c.execute(
            "SELECT * FROM mood_logs WHERE user_id=? AND created_at>=? ORDER BY created_at",
            (uid, since),
        ).fetchall()
    if not rows:
        return {"count": 0, "text": "这一周还没有记录。不用逼自己——想记的时候，团子都在。"}
    dist = {k: 0 for k in db.FAMS}
    trig: dict[str, int] = {}
    for r in rows:
        dist[r["fam"]] += 1
        for t in json.loads(r["triggers"]):
            trig[t] = trig.get(t, 0) + 1
    top_fam = max(dist, key=dist.get)
    top_trig = sorted(trig.items(), key=lambda kv: -kv[1])[:3]
    keep = next((r for r in reversed(rows) if r["fam"] in ("sun", "breeze")), rows[-1])
    summary = {
        "count": len(rows),
        "fam_counts": {db.FAMS[k]["name"]: v for k, v in dist.items()},
        "top_fam_name": db.FAMS[top_fam]["name"],
        "top_trigger": top_trig[0][0] if top_trig else None,
        "top_triggers": [t[0] for t in top_trig],
        "best_moment": {"word": keep["word"], "fam": db.FAMS[keep["fam"]]["name"],
                        "note": keep["note"], "at": keep["created_at"][:10]},
    }
    return {"count": len(rows), "summary": summary, "text": await llm.gen_weekly(summary)}
