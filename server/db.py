import sqlite3
import time
import os


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "app.db")


def get_db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def init_db():
    db = get_db()
    try:
        db.execute("""
            CREATE TABLE IF NOT EXISTS invites (
            token TEXT PRIMARY KEY,
            expires_at INTEGER,
            used INTEGER,
            one_time INTEGER DEFAULT 0
)

        """)
        db.commit()
    finally:
        db.close()


def create_invite(token, ttl, one_time=0):
    db = get_db()
    try:
        db.execute(
            "INSERT INTO invites VALUES (?, ?, 0, ?)",
            (token, int(time.time()) + ttl, one_time)
        )
        db.commit()
    finally:
        db.close()


def use_invite(token):
    db = get_db()
    try:
        cur = db.execute(
            "SELECT expires_at, used, one_time FROM invites WHERE token=?",
            (token,)
        )
        row = cur.fetchone()

        if not row:
            return False

        expires, used, one_time = row

        if expires < time.time():
            return False

        if one_time and used:
            return False

        return True
    finally:
        db.close()


def delete_invite(token):
    db = get_db()
    try:
        db.execute("DELETE FROM invites WHERE token=?", (token,))
        db.commit()
    finally:
        db.close()
