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

// Track references
let localAudioTrack;
let localVideoTrack;

// State
let isMuted = false;
let isCameraOff = false;

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
        } catch (videoError) {
            // Fallback to audio-only if camera denied
            console.warn('Camera denied, falling back to audio-only');
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }

        // Store track references
        localAudioTrack = localStream.getAudioTracks()[0];
        localVideoTrack = localStream.getVideoTracks()[0];

        // Show local preview
        const localVideo = document.getElementById('localVideo');
        if (localVideo && localVideoTrack) {
            localVideo.srcObject = localStream;
        }

        // Create peer connection
        peerConnection = new RTCPeerConnection(config);

        // Add local tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            const remoteVideo = document.getElementById('remoteVideo');
            
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
            }

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

        // Connection state monitoring
        peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', peerConnection.connectionState);
            
            if (peerConnection.connectionState === 'disconnected' || 
                peerConnection.connectionState === 'failed') {
                updateStatus('Connection lost');
                setTimeout(endCall, 2000);
            }
        };

        // Initiator creates offer
        if (isInitiator) {
            updateStatus('Calling...');
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            sendSignal({
                type: 'offer',
                offer
            });
        } else {
            updateStatus('Incoming call...');
        }

        // Apply any signals that arrived before WebRTC initialized
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

    // Update UI
    const muteBtn = document.getElementById('muteBtn');
    const muteIcon = document.getElementById('muteIcon');
    
    if (muteBtn && muteIcon) {
        muteIcon.textContent = isMuted ? '🔇' : '🎤';
        muteBtn.classList.toggle('bg-red-600', isMuted);
        muteBtn.classList.toggle('bg-gray-700', !isMuted);
    }

    return isMuted;
}

function toggleCamera() {
    if (!localVideoTrack) return;

    isCameraOff = !isCameraOff;
    localVideoTrack.enabled = !isCameraOff;

    // Update UI
    const cameraBtn = document.getElementById('cameraBtn');
    const cameraIcon = document.getElementById('cameraIcon');
    
    if (cameraBtn && cameraIcon) {
        cameraIcon.textContent = isCameraOff ? '📷' : '📹';
        cameraBtn.classList.toggle('bg-gray-600', isCameraOff);
        cameraBtn.classList.toggle('bg-gray-700', !isCameraOff);
    }

    return isCameraOff;
}

// ========================================
// CALL LIFECYCLE
// ========================================

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

// ========================================
// EVENT BINDINGS
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    const endBtn = document.getElementById('endCallBtn');
    const muteBtn = document.getElementById('muteBtn');
    const cameraBtn = document.getElementById('cameraBtn');

    if (endBtn) {
        endBtn.addEventListener('click', endCall);
    }

    if (muteBtn) {
        muteBtn.addEventListener('click', toggleMute);
    }

    if (cameraBtn) {
        cameraBtn.addEventListener('click', toggleCamera);
    }
});