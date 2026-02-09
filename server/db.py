import sqlite3
import time
import os


# Absolute path to the project root directory
# (…/chatchat/)
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Directory where the SQLite database lives
DB_DIR = os.path.join(BASE_DIR, "database")

# Full path to the SQLite database file
DB_PATH = os.path.join(DB_DIR, "app.db")


def get_db():
    # Ensure the database directory exists
    # SQLite will NOT create missing folders on its own
    os.makedirs(DB_DIR, exist_ok=True)

    # Open a connection to the SQLite database
    # check_same_thread=False allows access from multiple threads
    return sqlite3.connect(DB_PATH, check_same_thread=False)


def init_db():
    # Initialize database schema on server startup
    db = get_db()

    # Create the invites table if it does not exist
    # - token: unique invite identifier
    # - expires_at: unix timestamp
    # - used: 0 = unused, 1 = already consumed
    db.execute("""
        CREATE TABLE IF NOT EXISTS invites (
            token TEXT PRIMARY KEY,
            expires_at INTEGER,
            used INTEGER
        )
    """)

    # Persist schema changes
    db.commit()


def create_invite(token, ttl=600):
    # Create a new invite token with an expiration time
    db = get_db()

    db.execute(
        "INSERT INTO invites VALUES (?, ?, 0)",
        (
            token,
            int(time.time()) + ttl  # expiration timestamp
        )
    )

    # Persist the new invite
    db.commit()


def use_invite(token):
    # Validate and consume an invite token
    db = get_db()

    # Fetch invite state
    cur = db.execute(
        "SELECT used, expires_at FROM invites WHERE token=?",
        (token,)
    )
    row = cur.fetchone()

    # Token does not exist
    if not row:
        return False

    used, expires = row

    # Token already used or expired
    if used or expires < time.time():
        return False

    # Mark token as used (single-use guarantee)
    db.execute(
        "UPDATE invites SET used=1 WHERE token=?",
        (token,)
    )

    # Persist update
    db.commit()

    return True
