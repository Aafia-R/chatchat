import sqlite3
import time
import os


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "app.db")


def get_db():
    os.makedirs(DB_DIR, exist_ok=True)
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def init_db():
    db = get_db()
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS invites (
                token TEXT PRIMARY KEY,
                expires_at INTEGER,
                used INTEGER
            )
        """)
        db.commit()
    finally:
        db.close()


def create_invite(token, ttl):
    db = get_db()
    try:
        db.execute(
            "INSERT INTO invites VALUES (?, ?, 0)",
            (token, int(time.time()) + ttl)
        )
        db.commit()
    finally:
        db.close()


def use_invite(token):
    db = get_db()
    try:
        cur = db.execute(
            "SELECT used, expires_at FROM invites WHERE token=?",
            (token,)
        )
        row = cur.fetchone()

        if not row:
            return False

        used, expires = row

        if used or expires < time.time():
            return False

        db.execute(
            "UPDATE invites SET used=1 WHERE token=?",
            (token,)
        )
        db.commit()

        return True

    finally:
        db.close()
