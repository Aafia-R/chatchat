let localStream;
let peerConnection;
let startTime;

const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function initWebRTC(isInitiator) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    peerConnection = new RTCPeerConnection(config);
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });
    
    peerConnection.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
        updateStatus('Connected');
        document.getElementById('callControls').classList.remove('hidden');
        startTimer();
    };
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({ type: 'ice-candidate', candidate: event.candidate });
        }
    };
    
    if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        sendSignal({ type: 'offer', offer });
    }
}

async function handleSignal(data) {
    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(data.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal({ type: 'answer', answer });
    } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(data.answer);
    } else if (data.type === 'ice-candidate') {
        await peerConnection.addIceCandidate(data.candidate);
    }
}

function endCall() {
    if (peerConnection) peerConnection.close();
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    
    saveCallHistory();
    window.location.href = '/';
}

function startTimer() {
    startTime = Date.now();
    setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('duration').textContent = `${mins}:${secs}`;
    }, 1000);
}

function saveCallHistory() {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
    history.unshift({
        type: 'outgoing',
        time: Date.now(),
        duration
    });
    localStorage.setItem('callHistory', JSON.stringify(history.slice(0, 10)));
}