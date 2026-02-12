const socket = io();

let isInitiator = false;

socket.on('connect', () => {
    socket.emit('join', { token });
});

socket.on('ready', () => {
    isInitiator = socket.id < socket.id; // Simple initiator logic
    initWebRTC(isInitiator);
});

socket.on('signal', (data) => {
    handleSignal(data);
});

socket.on('peer-disconnect', () => {
    updateStatus('Call ended');
    setTimeout(() => window.location.href = '/', 2000);
});

function sendSignal(data) {
    socket.emit('signal', { token, ...data });
}

function updateStatus(msg) {
    document.getElementById('status').textContent = msg;
}