let chatSocket = null;
let session = null;


function connectChat() {
    session = getSessionInfo();
    if (!session) return;

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    chatSocket = new WebSocket(`${protocol}://${location.host}/ws/chat`);

    chatSocket.onopen = async () => {
        console.log("chat connected");

        // join session
        chatSocket.send(JSON.stringify({
            type: "join",
            session: session.sessionId,
            password: session.password,
            name: session.name
        }));

        // load previous history into UI
        const history = await loadMessages(session.sessionId);
        history.forEach(m => {
            if (typeof addMessageToUI === "function") {
                addMessageToUI(m, m.name === session.name);
            }
        });

        // resend any queued messages
        const queued = await loadQueue(session.sessionId);
        queued.forEach(msg => {
            chatSocket.send(JSON.stringify(msg));
        });
    };


    chatSocket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        // message from peer
        if (data.type === "chat") {

            await saveMessage(data);

            if (typeof addMessageToUI === "function") {
                addMessageToUI(data);
            }

            // send ack back
            chatSocket.send(JSON.stringify({
                type: "ack",
                id: data.id,
                session: session.sessionId
            }));
        }

        // delivery confirmation
        if (data.type === "ack") {
            await removeFromQueue(data.id);
        }

        // system message
        if (data.type === "system") {
            console.log("system:", data.msg);
        }
    };


    chatSocket.onclose = () => {
        console.log("chat disconnected, retrying...");
        setTimeout(connectChat, 1500);
    };
}


async function sendChat(text) {
    if (!chatSocket || chatSocket.readyState !== WebSocket.OPEN) {
        console.log("socket not ready");
        return;
    }

    const msg = {
        type: "chat",
        id: crypto.randomUUID(),
        session: session.sessionId,
        name: session.name,
        text: text,
        ts: Date.now()
    };

    await saveMessage(msg);
    await queueMessage(msg);

    chatSocket.send(JSON.stringify(msg));

    if (typeof addMessageToUI === "function") {
        addMessageToUI(msg, true);
    }
}


document.addEventListener("DOMContentLoaded", connectChat);