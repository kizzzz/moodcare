import datetime
import os
import sqlite3
from zoneinfo import ZoneInfo

DB_PATH = os.environ.get("MOODCARE_DB", os.path.join(os.path.dirname(__file__), "moodcare.db"))
# 产品面向中文用户，统一用北京时间；服务器容器为 UTC，避免跨零点后"今天"错位
TZ = ZoneInfo("Asia/Shanghai")

FAMS = {
    "wind": {"name": "风起", "val": -1, "aro": 1},
    "sun": {"name": "日晴", "val": 1, "aro": 1},
    "rain": {"name": "夜雨", "val": -1, "aro": -1},
    "breeze": {"name": "微风", "val": 1, "aro": -1},
}


def conn() -> sqlite3.Connection:
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def now() -> str:
    return datetime.datetime.now(TZ).isoformat(timespec="seconds")


def init() -> None:
    with conn() as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS users(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS mood_logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                fam TEXT NOT NULL,
                word TEXT NOT NULL,
                intensity INTEGER NOT NULL,
                triggers TEXT NOT NULL DEFAULT '[]',
                note TEXT NOT NULL DEFAULT '',
                ai_response TEXT NOT NULL DEFAULT '[]',
                crisis INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS letters(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                text TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_logs_user_time ON mood_logs(user_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_letters_user ON letters(user_id, created_at);
            """
        )
