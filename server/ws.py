import json
from db import use_invite
from config import MAX_PEERS


# token -> [ws1, ws2]
rooms = {}


def handle_ws(ws, token):
    # -----------------------------------------
    # First peer joining
    # -----------------------------------------
    if token not in rooms:
        # Validate and consume invite
        if not use_invite(token):
            ws.send(json.dumps({"type": "error", "message": "Invalid or expired invite"}))
            ws.close()
            return

        rooms[token] = [ws]

    # -----------------------------------------
    # Second peer joining
    # -----------------------------------------
    else:
        if len(rooms[token]) >= MAX_PEERS:
            ws.send(json.dumps({"type": "error", "message": "Room full"}))
            ws.close()
            return

        rooms[token].append(ws)

        # Notify both peers that room is ready
        for peer in rooms[token]:
            peer.send(json.dumps({"type": "ready"}))

    # -----------------------------------------
    # Message loop
    # -----------------------------------------
    try:
        while True:
            msg = ws.receive()

            if msg is None:
                break

            # Relay raw JSON message to the other peer
            for peer in rooms.get(token, []):
                if peer is not ws:
                    peer.send(msg)

    # -----------------------------------------
    # Disconnect handling
    # -----------------------------------------
    finally:
        if token in rooms and ws in rooms[token]:
            rooms[token].remove(ws)

            # Notify remaining peer
            for peer in rooms[token]:
                peer.send(json.dumps({"type": "peer-disconnect"}))

            # Cleanup empty room
            if not rooms[token]:
                del rooms[token]
