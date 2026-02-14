import json
from db import use_invite, get_db, delete_invite
from config import MAX_PEERS

# token -> [ws1, ws2]
rooms = {}


def mark_used(token):
    db = get_db()
    try:
        db.execute("UPDATE invites SET used=1 WHERE token=?", (token,))
        db.commit()
    finally:
        db.close()


def safe_send(ws, data):
    try:
        ws.send(json.dumps(data))
        return True
    except:
        return False


def handle_ws(ws, token):

    # -------------------------
    # First peer joins
    # -------------------------
    if token not in rooms:

        if not use_invite(token):
            safe_send(ws, {"type": "error", "message": "Invalid or expired invite"})
            ws.close()
            return

        rooms[token] = [ws]

    # -------------------------
    # Second peer joins
    # -------------------------
    else:
        if len(rooms[token]) >= MAX_PEERS:
            safe_send(ws, {"type": "error", "message": "Room full"})
            ws.close()
            return

        rooms[token].append(ws)

        # mark invite used ONLY when room becomes full
        mark_used(token)

        # assign roles explicitly
        safe_send(rooms[token][0], {"type": "ready", "role": "caller"})
        safe_send(rooms[token][1], {"type": "ready", "role": "callee"})

    # -------------------------
    # Message loop
    # -------------------------
    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break

            # relay to other peers safely
            for peer in rooms.get(token, [])[:]:
                if peer is not ws:
                    try:
                        peer.send(msg)
                    except:
                        rooms[token].remove(peer)

    # -------------------------
    # Disconnect handling
    # -------------------------
    finally:
        if token in rooms and ws in rooms[token]:
            rooms[token].remove(ws)

            for peer in rooms[token]:
                safe_send(peer, {"type": "peer-disconnect"})

            if not rooms[token]:
                delete_invite(token)
                del rooms[token]

