from flask import Flask
from flask_sock import Sock
from ws import handle_ws

app = Flask(__name__)
sock = Sock(app)

@sock.route("/ws")
def ws_route(ws):
    handle_ws(ws)

if __name__ == "__main__":
    app.run(debug=True)

