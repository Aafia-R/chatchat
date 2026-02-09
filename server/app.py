from flask import Flask, jsonify
from flask_sock import Sock
import secrets
from ws import handle_ws
from db import init_db, create_invite

app = Flask(__name__)
sock = Sock(app)

init_db()

@app.post("/invite")
def invite():
    token = secrets.token_urlsafe(16)
    create_invite(token)
    return jsonify({"token": token})

@sock.route("/ws/<token>")
def ws_route(ws, token):
    handle_ws(ws, token)

if __name__ == "__main__":
    app.run(debug=True)

