import os
import secrets

from flask import Flask, jsonify, send_from_directory, abort, request
from flask_sock import Sock

from ws import handle_ws
from db import init_db, create_invite
from config import INVITE_TTL


# -------------------------------------------------
# Paths
# -------------------------------------------------

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLIENT_DIR = os.path.join(BASE_DIR, "client")


# -------------------------------------------------
# App Setup
# -------------------------------------------------

app = Flask(
    __name__,
    static_folder=CLIENT_DIR,
    static_url_path=""
)

sock = Sock(app)

# Initialize database
init_db()


# -------------------------------------------------
# Routes
# -------------------------------------------------

# Home page
@app.get("/")
def index():
    return send_from_directory(CLIENT_DIR, "index.html")


# Call page
@app.get("/call/<token>")
def call_page(token):
    # We do NOT validate token here.
    # Validation happens on WebSocket connect.
    return send_from_directory(CLIENT_DIR, "call.html")


# Static JS/CSS files
@app.get("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "js"), filename)


@app.get("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory(os.path.join(CLIENT_DIR, "css"), filename)


# Create invite
@app.post("/invite")
def invite():
    data = {}
    try:
        data = request.get_json() or {}
    except:
        pass

    # default TTL if none provided
    ttl = data.get("ttl", INVITE_TTL)
    one_time = int(data.get("one_time", 0))


    # clamp TTL to safe limits (30 sec → 24h)
    ttl = max(30, min(int(ttl), 86400))

    token = secrets.token_urlsafe(16)
    create_invite(token, ttl=ttl, one_time=one_time)

    return jsonify({"token": token, "expires_in": ttl})



# WebSocket signaling
@sock.route("/ws/<token>")
def ws_route(ws, token):
    handle_ws(ws, token)


# -------------------------------------------------
# Run
# -------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
