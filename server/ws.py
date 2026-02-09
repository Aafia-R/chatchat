from db import use_invite

rooms = {}  # token -> [ws1, ws2]

def handle_ws(ws, token):
    if token not in rooms:
        if not use_invite(token):
            ws.close()
            return
        rooms[token] = [ws]
    else:
        rooms[token].append(ws)

    if len(rooms[token]) > 2:
        ws.close()
        return

    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break
            for peer in rooms[token]:
                if peer is not ws:
                    peer.send(msg)
    finally:
        rooms[token].remove(ws)
        if not rooms[token]:
            del rooms[token]

