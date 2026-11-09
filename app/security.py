import hashlib
import hmac
import os
import time

import jwt

SECRET = os.environ.get("MOODCARE_SECRET", "dev-secret-change-me")
TOKEN_DAYS = 30


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return salt.hex() + "$" + digest.hex()


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, want = stored.split("$", 1)
        digest = hashlib.scrypt(
            password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1, dklen=32
        )
        return hmac.compare_digest(digest.hex(), want)
    except ValueError:
        return False


def make_token(user_id: int) -> str:
    payload = {"uid": user_id, "exp": int(time.time()) + TOKEN_DAYS * 86400}
    return jwt.encode(payload, SECRET, algorithm="HS256")


def parse_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
        return int(payload["uid"])
    except Exception:
        return None
