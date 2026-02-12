let localStream;
let peerConnection;
let startTime;
let timerInterval;
let remoteDescriptionSet = false;
let pendingCandidates = [];

const config = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

async function initWebRTC(isInitiator) {
    try {
        updateStatus('Requesting microphone access...');

        localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        peerConnection = new RTCPeerConnection(config);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Remote stream
        peerConnection.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.play();

            updateStatus('Connected');
            showCallControls();
            startTimer();
        };

        // ICE handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal({
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };

        // Initiator creates offer
        if (isInitiator) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            sendSignal({
                type: 'offer',
                offer
            });
        }

    } catch (err) {
        console.error('Media error:', err);
        alert('Microphone permission denied or unavailable.');
        window.location.href = '/';
    }
}

async function handleSignal(data) {
    if (!peerConnection) return;

    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        remoteDescriptionSet = true;

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendSignal({
            type: 'answer',
            answer
        });

        flushPendingCandidates();
    }

    else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
        );
        remoteDescriptionSet = true;

        flushPendingCandidates();
    }

    else if (data.type === 'ice-candidate') {
        const candidate = new RTCIceCandidate(data.candidate);

        if (remoteDescriptionSet) {
            await peerConnection.addIceCandidate(candidate);
        } else {
            pendingCandidates.push(candidate);
        }
    }
}

function flushPendingCandidates() {
    pendingCandidates.forEach(async candidate => {
        await peerConnection.addIceCandidate(candidate);
    });
    pendingCandidates = [];
}

function endCall() {
    cleanupConnection();
    saveCallToHistory();
    window.location.href = '/';
}

function cleanupConnection() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
}

function startTimer() {
    startTime = Date.now();

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(elapsed % 60).padStart(2, '0');

        const el = document.getElementById('duration');
        if (el) el.textContent = `${mins}:${secs}`;
    }, 1000);
}

function saveCallToHistory() {
    if (!startTime) return;

    const duration = Math.floor((Date.now() - startTime) / 1000);

    if (typeof saveCall === 'function') {
        saveCall({
            direction: 'outgoing',
            startedAt: Date.now(),
            duration,
            peer: 'unknown'
        });
    }
}

function showCallControls() {
    const el = document.getElementById('callControls');
    if (el) el.classList.remove('hidden');
}

// Bind end button safely
document.addEventListener('DOMContentLoaded', () => {
    const endBtn = document.getElementById('endCall');
    if (endBtn) {
        endBtn.addEventListener('click', endCall);
    }
});
