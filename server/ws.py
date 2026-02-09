import json

clients = []

def handle_ws(ws):
    # Register client
    clients.append(ws)
    print("Client connected:", len(clients))

    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break

            # Relay to the other client
            for client in clients:
                if client is not ws:
                    client.send(msg)

    finally:
        clients.remove(ws)
        print("Client disconnected:", len(clients))

