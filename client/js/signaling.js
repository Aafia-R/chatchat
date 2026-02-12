let socket;
let isInitiator = false;

// Extract token from URL: /call/<token>
function getTokenFromURL() {
    const parts = window.location.pathname.split('/');
    return parts[2];
}

const token = getTokenFromURL();

function connectWebSocket() {
    socket = new WebSocket(`ws://${window.location.host}/ws/${token}`);

    socket.onopen = () => {
        updateStatus('Waiting for peer...');
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data.type === 'ready') {
                // First peer becomes initiator
                if (!peerConnection) {
                    isInitiator = true;
                    initWebRTC(isInitiator);
                }
            }

            else if (data.type === 'peer-disconnect') {
                updateStatus('Peer disconnected');
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            }

            else if (data.type === 'error') {
                alert(data.message);
                window.location.href = '/';
            }

            else {
                handleSignal(data);
            }

        } catch (err) {
            console.error('Invalid WS message:', err);
        }
    };

    socket.onerror = () => {
        updateStatus('Connection error');
    };

    socket.onclose = () => {
        updateStatus('Connection closed');
    };
}

function sendSignal(data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

function updateStatus(message) {
    const el = document.getElementById('status');
    if (el) {
        el.textContent = message;
    }
}

// Start connection immediately
connectWebSocket();
