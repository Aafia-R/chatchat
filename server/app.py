# Flask provides the HTTP server and routing
from flask import Flask, jsonify

# flask-sock adds WebSocket support on top of Flask
from flask_sock import Sock

# secrets is used to generate secure, random invite tokens
import secrets

# WebSocket handling logic (pairing + message relay)
from ws import handle_ws

# Database helpers (invite storage only)
from db import init_db, create_invite


# Create the Flask application
app = Flask(__name__)

# Attach WebSocket support to the Flask app
sock = Sock(app)


# Initialize the SQLite database on server startup
# - creates database file if missing
# - creates invites table if missing
init_db()


# HTTP endpoint to create a new invite
# Called by the client when "Create Call" is clicked
@app.post("/invite")
def invite():
    # Generate a cryptographically secure random token
    # This token will be used exactly once
    token = secrets.token_urlsafe(16)

    # Store the token in SQLite with expiry + unused flag
    create_invite(token)

    # Return the token to the client as JSON
    return jsonify({"token": token})


# WebSocket endpoint for signaling
# Clients connect to /ws/<token>
# Only clients with a valid invite token are allowed
@sock.route("/ws/<token>")
def ws_route(ws, token):
    # Delegate all WebSocket logic to ws.py
    # This function:
    # - validates the token
    # - pairs exactly two clients
    # - relays signaling messages between them
    handle_ws(ws, token)


# Start the development server
# Debug mode is fine for V1 testing only
if __name__ == "__main__":
    app.run(debug=True)

