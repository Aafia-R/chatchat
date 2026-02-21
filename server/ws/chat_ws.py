import json

# session_id -> [ws1, ws2]
sessions = {}

# ws -> user info
clients = {}


def safe_send(ws, data):
    try:
        ws.send(json.dumps(data))
        return True
    except:
        return False


def handle_chat_ws(ws):
    session_id = None

    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break

            data = json.loads(msg)

            # ---- USER JOIN ----
            if data["type"] == "join":
                session_id = data["session"]
                name = data["name"]

                clients[ws] = {
                    "session": session_id,
                    "name": name
                }

                if session_id not in sessions:
                    sessions[session_id] = []

                sessions[session_id].append(ws)

                safe_send(ws, {
                    "type": "system",
                    "msg": f"Joined session {session_id}"
                })

            # ---- CHAT MESSAGE ----
            elif data["type"] == "chat":
                session_id = data["session"]

                # relay to other peers in same session
                for peer in sessions.get(session_id, [])[:]:
                    if peer is not ws:
                        safe_send(peer, data)

            # ---- ACK ----
            elif data["type"] == "ack":
                session_id = data["session"]

                for peer in sessions.get(session_id, [])[:]:
                    if peer is not ws:
                        safe_send(peer, data)

    finally:
        # ---- CLEANUP ON DISCONNECT ----
        if ws in clients:
            session_id = clients[ws]["session"]

            if session_id in sessions and ws in sessions[session_id]:
                sessions[session_id].remove(ws)

                if not sessions[session_id]:
                    del sessions[session_id]

            del clients[ws]