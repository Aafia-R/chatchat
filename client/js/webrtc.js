// ========================================
// WEBRTC VIDEO + AUDIO ENGINE
// ========================================

let localStream;
let peerConnection;
let callDirection = "outgoing";
let startTime;
let timerInterval;
let remoteDescriptionSet = false;
let pendingCandidates = [];
let p2pFailureShown = false;
let everConnected = false;

// Track references
let localAudioTrack;
let localVideoTrack;

// State
let isMuted = false;
let isCameraOff = false;

// ICE throttling
let iceSendTimer = null;
let iceQueue = [];

const config = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

// ========================================
// INIT WITH VIDEO + AUDIO
// ========================================

async function initWebRTC(isInitiator) {
    try {
        updateStatus('Requesting camera and microphone...');

        // Request video + audio
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });
        } catch {
            console.warn('Camera denied, falling back to audio-only');
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        localAudioTrack = localStream.getAudioTracks()[0];
        localVideoTrack = localStream.getVideoTracks()[0];

        const localVideo = document.getElementById('localVideo');
        if (localVideo && localVideoTrack) {
            localVideo.srcObject = localStream;
        }

        peerConnection = new RTCPeerConnection(config);

        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // =========================
        // Remote stream arrived
        // =========================
        peerConnection.ontrack = (event) => {
            everConnected = true;

            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
            }

            updateStatus('Direct connection established');
            showCallControls();
            startTimer();
        };

        // =========================
        // ICE candidate sending (throttled)
        // =========================
        peerConnection.onicecandidate = (event) => {
            if (!event.candidate) return;

            iceQueue.push(event.candidate);

            if (!iceSendTimer) {
                iceSendTimer = setTimeout(() => {
                    iceQueue.forEach(c =>
                        sendSignal({ type: 'ice-candidate', candidate: c })
                    );
                    iceQueue = [];
                    iceSendTimer = null;
                }, 50);
            }
        };

        // =========================
        // ICE state monitoring
        // =========================
        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE state:', peerConnection.iceConnectionState);

            if (peerConnection.iceConnectionState === 'failed' && !everConnected) {
                showP2PFailure();
            }
        };

        // =========================
        // Connection state monitoring
        // =========================
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);

            if (peerConnection.connectionState === 'failed') {
                if (!everConnected) {
                    showP2PFailure();
                } else {
                    restartIce();
                }
            }

            else if (peerConnection.connectionState === 'disconnected') {
                updateStatus('Connection lost… attempting recovery');
                setTimeout(restartIce, 1200);
            }
        };

        // =========================
        // Offer creation
        // =========================
        if (isInitiator) {
            updateStatus('Testing direct connection…');

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            sendSignal({
                type: 'offer',
                offer
            });

        } else {
            updateStatus('Connecting to peer…');
        }

        // Apply buffered signals
        if (typeof flushBufferedSignals === "function") {
            flushBufferedSignals();
        }

    } catch (err) {
        console.error('Media error:', err);

        if (err.name === 'NotAllowedError') {
            alert('Camera/microphone permission denied.');
        } else if (err.name === 'NotFoundError') {
            alert('No camera or microphone found.');
        } else {
            alert('Failed to access media devices.');
        }

        window.location.href = '/';
    }
}

// ========================================
// ICE RESTART (network recovery)
// ========================================

async function restartIce() {
    if (!peerConnection) return;

    console.log("Attempting ICE restart…");

    try {
        const offer = await peerConnection.createOffer({ iceRestart: true });
        await peerConnection.setLocalDescription(offer);

        sendSignal({
            type: "offer",
            offer
        });

        updateStatus("Reconnecting…");

    } catch (err) {
        console.error("ICE restart failed:", err);
    }
}

// ========================================
// SIGNALING HANDLERS
// ========================================

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

// ========================================
// MEDIA CONTROLS
// ========================================

function toggleMute() {
    if (!localAudioTrack) return;

    isMuted = !isMuted;
    localAudioTrack.enabled = !isMuted;

    const muteBtn = document.getElementById('muteBtn');
    const muteIcon = document.getElementById('muteIcon');

    if (muteBtn && muteIcon) {
        muteIcon.textContent = isMuted ? '🔇' : '🎤';
        muteBtn.classList.toggle('bg-red-600', isMuted);
        muteBtn.classList.toggle('bg-gray-700', !isMuted);
    }
}

function toggleCamera() {
    if (!localVideoTrack) return;

    isCameraOff = !isCameraOff;
    localVideoTrack.enabled = !isCameraOff;

    const cameraBtn = document.getElementById('cameraBtn');
    const cameraIcon = document.getElementById('cameraIcon');

    if (cameraBtn && cameraIcon) {
        cameraIcon.textContent = isCameraOff ? '📷' : '📹';
        cameraBtn.classList.toggle('bg-gray-600', isCameraOff);
        cameraBtn.classList.toggle('bg-gray-700', !isCameraOff);
    }
}

// ========================================
// CALL LIFECYCLE
// ========================================

function endCall() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }

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
            direction: callDirection,
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

// ========================================
// UI HELPERS
// ========================================

function updateStatus(text) {
    const el = document.getElementById('status');
    if (el) el.textContent = text;
}

function showP2PFailure() {
    if (p2pFailureShown) return;
    p2pFailureShown = true;

    updateStatus("Unable to establish direct connection");

    alert(
        "A direct peer-to-peer connection could not be established.\n\n" +
        "This usually happens on strict mobile networks, corporate Wi-Fi, or firewalled connections.\n\n" +
        "Try switching to another network or Wi-Fi."
    );

    setTimeout(() => {
        window.location.href = '/';
    }, 3000);
}

// ========================================
// PERFORMANCE: pause video when tab hidden
// ========================================

document.addEventListener("visibilitychange", () => {
    if (!localVideoTrack) return;

    if (document.hidden) {
        localVideoTrack.enabled = false;
    } else if (!isCameraOff) {
        localVideoTrack.enabled = true;
    }
});

// ========================================
// EVENT BINDINGS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const endBtn = document.getElementById('endCallBtn');
    const muteBtn = document.getElementById('muteBtn');
    const cameraBtn = document.getElementById('cameraBtn');

    if (endBtn) endBtn.addEventListener('click', endCall);
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (cameraBtn) cameraBtn.addEventListener('click', toggleCamera);
});
