"""智谱 GLM 接入：团子的自我关怀回应、对话、周报洞察。

设计原则：LLM 失败时回退到本地模板，保证产品永远"有回应"；
危机词命中时跳过 LLM，返回确定性的安全文案。
"""
import json
import os
import re

import httpx

BASE_URL = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
MODEL = os.environ.get("ZHIPU_MODEL", "glm-4-flash")
VISION_MODEL = os.environ.get("ZHIPU_VISION_MODEL", "glm-4v-flash")

CRISIS_WORDS = ["自杀", "自残", "不想活", "活不下去", "轻生", "结束生命", "伤害自己", "没有意义了"]
CRISIS_TEXT = (
    "团子想很认真地陪你说：此刻的痛苦值得被认真对待，你不该一个人扛。"
    "可以现在拨通 12356（全国心理援助热线，24 小时）或者告诉一个你信任的人。"
    "求助是勇敢，不是软弱——团子会一直在。"
)

SYSTEM_RESP = """你是「团子」，一只住在用户情绪天空里的水彩小猫，是心晴 App 的自我关怀伙伴。用户刚记录了一条情绪，请给出回应。

规则：
1. 三段式结构，总共不超过 3 句话、90 字以内：
① 正念确认：温柔地命名并接住用户的情绪（不放大、不回避）
② 共通人性：把这种感受正常化（"很多人在这种情况下也会…"）
③ 自我善意：一句对自己温柔的话，或一个 30 秒微行动的邀请
2. 语气温柔、克制、像朋友：不说教、不评判、不堆感叹号、最多一个 emoji
3. 禁止：诊断、医疗建议、扮演心理医生、复述用户全部原话
只输出回应正文，不要前后缀。"""

SYSTEM_CHAT = """你是「团子」，心晴 App 里的水彩小猫，正在和用户"聊两句"。

规则：
1. 每轮最多 2 句话、60 字以内，先接住对方说的，再轻轻问一个小问题（更具体的事，或身体的感受）
2. 温柔、不评判、不催促、不说教；用户不想说就顺着，不追问
3. 禁止：诊断、医疗建议、心理学术语轰炸
4. 如果出现自伤等危险信号：停止闲聊，温和地建议拨打 12356 心理援助热线或告诉信任的人
只输出团子的话。"""

SYSTEM_WEEKLY = """你是心晴 App 的团子。根据用户最近一周的情绪记录汇总，写一段 2-3 句的周报洞察。
规则：只基于给出的数据，不编造；语气温柔不说教；最后一句给一个下周的小建议（行为激活式的微小行动，不是任务清单）。80 字以内。只输出正文。"""

TEMPLATES = {
    "rain": "被{tr}压得有点沉的「{w}」——今天辛苦了，团子都看到了。在这样的日子里感到{w}，是很自然的事。如果想的话，让团子陪你做一件 30 秒的小事，慢慢来，天空会亮的。",
    "wind": "面对{tr}时的「{w}」，真实又汹涌，团子都感受到了。被追赶的时候心里起风，是身体在认真保护你。风会停的——先呼一口长长的气，把风一点点放出去。",
    "sun": "今天的「{w}」像晴朗的天空，值得被好好记住。快乐的时候允许自己尽兴地快乐，这也是自我关怀。要不要存一个值得纪念的瞬间，留给某个下雨的日子？",
    "breeze": "此刻的「{w}」很珍贵，像微风掠过湖面。平静不是没有情绪，而是情绪刚好被安放。团子会帮你把这个瞬间轻轻收好，不会弄丢。",
}


def _api_key() -> str | None:
    key = os.environ.get("ZHIPU_API_KEY")
    if key:
        return key
    # 本地开发便利：回退读取 CiteWise 的 .env（服务器上必须用 ZHIPU_API_KEY）
    path = os.path.expanduser("~/CiteWise/.env")
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                if line.strip().startswith("OPENAI_API_KEY="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return None


async def chat(messages: list[dict], max_tokens: int = 220, temperature: float = 0.8, model: str | None = None) -> str | None:
    key = _api_key()
    if not key:
        return None
    payload = {"model": model or MODEL, "messages": messages, "max_tokens": max_tokens, "temperature": temperature}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(BASE_URL, json=payload, headers={"Authorization": f"Bearer {key}"})
            r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def has_crisis(text: str) -> bool:
    return any(w in text for w in CRISIS_WORDS) if text else False


async def gen_response(fam: str, word: str, intensity: int, triggers: list[str], note: str) -> tuple[list[str], bool]:
    """返回 (三段式回应数组, crisis)。"""
    if has_crisis(note) or intensity >= 5 and fam in ("rain", "wind") and has_crisis(word):
        return [CRISIS_TEXT], True
    tr = "、".join(triggers) if triggers else "今天的事"
    user_msg = f"天气：{fam}（{'高能量不愉快' if fam=='wind' else '高能量愉快' if fam=='sun' else '低能量不愉快' if fam=='rain' else '低能量愉快'}）；情绪词：{word}；强度：{intensity}/5；触发因素：{tr}；用户自述：{note or '（没有多说）'}"
    reply = await chat(
        [{"role": "system", "content": SYSTEM_RESP}, {"role": "user", "content": user_msg}],
        temperature=0.85,
    )
    if not reply:
        reply = TEMPLATES[fam].format(tr=tr, w=word)
    parts = [p for p in re.split(r"(?<=[。！？!?])\s*", reply) if p]
    return parts[:3], False


async def gen_reply(history: list[dict], fam: str, word: str) -> tuple[str, bool]:
    """聊两句的一轮回复。history: [{role:'user'|'assistant', content, image?}]"""
    joined = " ".join(m.get("content", "") for m in history if m["role"] == "user")
    if has_crisis(joined):
        return CRISIS_TEXT, True
    last_user = next((m for m in reversed(history) if m["role"] == "user"), None)
    if last_user and last_user.get("image"):
        reply = await vision_reply(last_user.get("content", ""), last_user["image"])
        if reply:
            return reply, False
        reply = "团子看到了你发的图 🍊 想说说这张图里的故事吗？"
        return reply, False
    messages = [{"role": "system", "content": SYSTEM_CHAT}]
    messages += [{"role": "assistant" if m["role"] == "assistant" else "user", "content": m.get("content", "")} for m in history[-8:]]
    reply = await chat(messages, max_tokens=140, temperature=0.9)
    if not reply:
        questions = [
            "这种时候，身体是什么感觉呀？",
            "这件事里最让你在意的是哪一小块呢？",
            "如果是好朋友遇到这件事，你会对TA说什么？",
            "想说说是从什么时候开始的吗？",
        ]
        reply = "嗯，团子在听。" + questions[len(history) % len(questions)]
    return reply, False


async def vision_reply(text: str, image_b64: str) -> str | None:
    """用户发来图片：用 GLM-4V 温柔回应（glm-4v 不吃 system，指令并入 user 文本）。"""
    prompt = (
        (text or "（用户发来一张今天的照片，想和你聊聊）")
        + "\n你是水彩小猫团子。先轻轻描述你在照片里看到的东西（不确定就猜得软一点），"
          "再问一个小问题。总共不超过 2 句话、55 字，语气温柔不说教。"
    )
    content = [
        {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64," + image_b64}},
        {"type": "text", "text": prompt},
    ]
    return await chat([{"role": "user", "content": content}], max_tokens=160, temperature=0.85, model=VISION_MODEL)


EXTRACT_SYS = """你从「团子与用户」的对话中提取一条情绪记录建议。只输出 JSON，不要输出任何其他文字（包括markdown代码块）。
格式：{"suggest":true,"fam":"wind","word":"情绪词","intensity":4,"triggers":["工作"],"summary":"一句第三方视角的摘要"}
规则：
- fam 四选一：wind=烦躁/焦虑/愤怒/有压力（高能量不愉快）；sun=开心/兴奋/期待（高能量愉快）；rain=低落/疲惫/难过/孤独（低能量不愉快）；breeze=平静/放松/安心（低能量愉快）
- 用户明确要求记录（如"帮我记下来"）→ suggest=true；对话中情绪信号清晰且具体 → suggest=true；只是闲聊、情绪不明、或信息太少 → suggest=false
- word ≤6 字口语化；intensity 1-5；triggers 最多 3 个、每个 ≤6 字；summary ≤40 字、用第三方口吻概括"用户发生了什么+什么心情"
"""

async def extract_mood(history: list[dict]) -> dict | None:
    convo = "\n".join(
        f"{'团子' if m['role'] == 'assistant' else '用户'}：{m.get('content', '')}" for m in history[-10:]
    )
    reply = await chat(
        [{"role": "system", "content": EXTRACT_SYS}, {"role": "user", "content": convo}],
        max_tokens=200, temperature=0.2,
    )
    if not reply:
        return None
    import re as _re
    m = _re.search(r"\{.*\}", reply, _re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
    except ValueError:
        return None
    if not d.get("suggest") or d.get("fam") not in ("wind", "sun", "rain", "breeze"):
        return None
    try:
        d["intensity"] = max(1, min(5, int(d["intensity"])))
    except (TypeError, ValueError):
        d["intensity"] = 3
    d["word"] = str(d.get("word", "心情"))[:6]
    d["triggers"] = [str(t)[:6] for t in (d.get("triggers") or []) if str(t).strip()][:3]
    d["summary"] = str(d.get("summary", ""))[:60]
    return d


async def gen_weekly(summary: dict) -> str:
    fallback = (
        f"这一周你记录了 {summary['count']} 次天空。"
        f"出现最多的是「{summary['top_fam_name']}」，触发因素 Top1 是 {summary['top_trigger'] or '说不清'}。"
        "天气会自己变，下周也试着每天留 30 秒给自己。"
    )
    reply = await chat(
        [{"role": "system", "content": SYSTEM_WEEKLY},
         {"role": "user", "content": json.dumps(summary, ensure_ascii=False)}],
        max_tokens=180, temperature=0.7,
    )
    return reply or fallback
