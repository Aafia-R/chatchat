from db import use_invite


# In-memory map of active call rooms
# Key: invite token
# Value: list of WebSocket connections (max 2)
rooms = {}  # token -> [ws1, ws2]


def handle_ws(ws, token):
    # First client joining this token
    if token not in rooms:
        # Validate and consume the invite token
        # - must exist
        # - must not be expired
        # - must not be already used
        if not use_invite(token):
            # Invalid or already-used token → reject connection
            ws.close()
            return

        # Create a new room with the first participant
        rooms[token] = [ws]

    # Second (or later) client joining this token
    else:
        rooms[token].append(ws)

    # Enforce 1-to-1 calls only
    # Any third connection is immediately rejected
    if len(rooms[token]) > 2:
        ws.close()
        return

    try:
        # Main signaling loop
        while True:
            # Block until a message is received
            msg = ws.receive()

            # None means the socket was closed
            if msg is None:
                break

            # Relay message to the other peer in the room
            for peer in rooms[token]:
                if peer is not ws:
                    peer.send(msg)

    finally:
        # Cleanup when a client disconnects
        rooms[token].remove(ws)

        # Remove the room entirely if empty
        if not rooms[token]:
            del rooms[token]
