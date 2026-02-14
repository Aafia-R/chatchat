let socket;
let isInitiator = false;
let pendingSignals = [];

// Extract token from URL
function getTokenFromURL() {
    const parts = window.location.pathname.split('/');
    return parts[2];
}

const token = getTokenFromURL();

function connectWebSocket() {

    const protocol = location.protocol === "https:" ? "wss" : "ws";
    socket = new WebSocket(`${protocol}://${window.location.host}/ws/${token}`);

    socket.onopen = () => {
        updateStatus('Waiting for peer...');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
                if (!peerConnection) {
                    isInitiator = data.role === "caller";
                    window.callDirection = isInitiator ? "outgoing" : "incoming";
                    initWebRTC(isInitiator);
                }
            }

            else if (data.type === 'peer-disconnect') {
                updateStatus('Peer disconnected');
                setTimeout(() => window.location.href = '/', 2000);
            }

            else if (data.type === 'error') {
                alert(data.message);
                window.location.href = '/';
            }

            else {
                if (!peerConnection) {
                    pendingSignals.push(data);
                } else {
                    handleSignal(data);
                }
            }

        } catch (err) {
            console.error('Invalid WS message:', err);
        }
    };

    socket.onerror = () => {
        updateStatus('Connection error');
    };

    socket.onclose = () => {
        updateStatus('Connection lost, retrying...');
        setTimeout(connectWebSocket, 1500);
    };
}

function sendSignal(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

function flushBufferedSignals() {
    pendingSignals.forEach(handleSignal);
    pendingSignals = [];
}

function updateStatus(message) {
    const el = document.getElementById('status');
    if (el) el.textContent = message;
}

connectWebSocket();
