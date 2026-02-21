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

// reconnecting
let reconnectAttempts = 0;
let reconnectTimer = null;

let reconnecting = false;
let dataChannel = null;
let peerLeft = false;
let pingInterval = null;
let lastPong = Date.now();
let qualityInterval = null;

let disconnectGraceTimer = null;

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

        // =========================
        // MEDIA SETUP
        // =========================
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

        // =========================
        // PEER CONNECTION
        // =========================
        peerConnection = new RTCPeerConnection(config);

        // ---------- DATA CHANNEL FOR PING ----------
        if (isInitiator) {
            dataChannel = peerConnection.createDataChannel("ping");
            setupDataChannel();
        } else {
            peerConnection.ondatachannel = (event) => {
                dataChannel = event.channel;
                setupDataChannel();
            };
        }

        // Add tracks
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // =========================
        // REMOTE STREAM ARRIVED
        // =========================
        peerConnection.ontrack = (event) => {

            const remoteVideo = document.getElementById('remoteVideo');
            if (remoteVideo) {
                remoteVideo.srcObject = event.streams[0];
            }

            // first real confirmation call is working
            if (!everConnected) {
                everConnected = true;
                showReconnectOverlay(false);
                reconnectAttempts = 0;
                reconnecting = false;
            }

            updateStatus('Direct connection established');
            showCallControls();

            if (!timerInterval) startTimer();
            startQualityMonitor();
        };

        // =========================
        // ICE CANDIDATES (throttled send)
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
        // ICE STATE MONITORING
        // Only react to real failure
        // =========================
        peerConnection.oniceconnectionstatechange = () => {
           if (state === "failed") {

            reconnectAttempts++;

            // stop after 3 attempts
            if (reconnectAttempts >= 3) {
                showP2PFailure();
                return;
            }

            if (!everConnected) {
                updateStatus("Retrying direct connection…");
                restartIce();
                return;
            }

            reconnecting = true;
            pauseTimer();
            scheduleReconnect();
        }

     };

        // =========================
        // CONNECTION STATE
        // Ignore "disconnected" completely (it's noisy)
        // =========================
        peerConnection.onconnectionstatechange = () => {

            if (peerLeft) return;

            const state = peerConnection.connectionState;
            console.log("Connection state:", state);

            // CONNECTION RECOVERED OR FIRST CONNECT
            if (state === "connected") {
                reconnectAttempts = 0;
                reconnecting = false;
                showReconnectOverlay(false);
                resumeTimer();
                updateStatus('Direct connection established');
                return;
            }

            // ONLY REAL FAILURE TRIGGERS RECONNECT
            if (state === "failed") {
                if (!everConnected) return;

                reconnecting = true;
                pauseTimer();
                scheduleReconnect();
            }

            // DO NOTHING on "disconnected"
            // browsers fire this randomly even when media is fine
        };


        // =========================
        // OFFER CREATION
        // =========================
        if (isInitiator) {
            updateStatus('Testing direct connection…');

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            sendSignal({ type: 'offer', offer });

        } else {
            updateStatus('Connecting to peer…');
        }

        // =========================
        // PROCESS BUFFERED SIGNALS
        // =========================
        if (typeof flushBufferedSignals === "function") {
            flushBufferedSignals();
        }

    } catch (err) {
        console.error('Media error:', err);

        if (err.name === 'NotAllowedError')
            alert('Camera/microphone permission denied.');
        else if (err.name === 'NotFoundError')
            alert('No camera or microphone found.');
        else
            alert('Failed to access media devices.');

        window.location.href = '/';
    }
}

// ========================================
// ICE RESTART (network recovery)
// ========================================

async function restartIce() {
    if (!peerConnection) return;

    try {
        const offer = await peerConnection.createOffer({ iceRestart: true });
        await peerConnection.setLocalDescription(offer);
        sendSignal({ type: "offer", offer });
        updateStatus("Reconnecting…");
    } catch (err) {
        console.error("ICE restart failed:", err);
    }
}

function scheduleReconnect() {

    if (peerLeft) return;
    if (!peerConnection) return;
    if (!everConnected) return;

    // WAIT before assuming reconnect (peer may be ending call)
    if (!disconnectGraceTimer) {
        disconnectGraceTimer = setTimeout(() => {
            disconnectGraceTimer = null;

            // peer might have left during grace period
            if (peerLeft) return;
            if (!peerConnection) return;
            if (peerConnection.connectionState === "connected") return;

            reconnecting = true;
            pauseTimer();
            showReconnectOverlay(true);
            updateStatus("Reconnecting…");

            reconnectAttempts++;

            if (reconnectAttempts >= 3) {

                updateStatus("Reconnection failed");
                setTimeout(endCall, 2000);
                return;
            }

            restartIce();

        }, 1800);   // <-- grace period (tuneable)

        return;
    }
}


// ========================================
// DATA CHANNEL PING SYSTEM
// ========================================

function setupDataChannel() {
    if (!dataChannel) return;

    dataChannel.onopen = () => {
        startPingLoop();
    };

    dataChannel.onmessage = (event) => {
        if (event.data === "ping") dataChannel.send("pong");
        if (event.data === "pong") lastPong = Date.now();
    };
}

function startPingLoop() {
    if (pingInterval) clearInterval(pingInterval);

    pingInterval = setInterval(() => {
        if (!dataChannel || dataChannel.readyState !== "open") return;

        try {
            dataChannel.send("ping");

            if (Date.now() - lastPong > 6000 && everConnected) {
                scheduleReconnect();
            }
        } catch (e) {
            console.warn("Ping error", e);
        }
    }, 2000);
}

// ========================================
// SIGNALING HANDLERS
// ========================================

async function handleSignal(data) {
    if (!peerConnection) return;

    if (data.type === 'leave') {

        peerLeft = true;
        reconnecting = false;

        if (disconnectGraceTimer) {
            clearTimeout(disconnectGraceTimer);
            disconnectGraceTimer = null;
        }

        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        showReconnectOverlay(false);
        updateStatus("Peer left the call");

        cleanupConnection();

        setTimeout(() => {
            window.location.href = '/';
        }, 1000);

        return;
    }


    if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.offer)
        );
        remoteDescriptionSet = true;

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendSignal({ type: 'answer', answer });
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
    peerLeft = true;          // important: set BEFORE signaling
    reconnecting = false;

    try {
        sendSignal({ type: "leave" });
    } catch (e) { }

    cleanupConnection();
    saveCallToHistory();

    window.location.href = '/';
}


function cleanupConnection() {
    if (timerInterval) clearInterval(timerInterval);
    if (pingInterval) clearInterval(pingInterval);
    if (qualityInterval) clearInterval(qualityInterval);

    if (peerConnection) peerConnection.close();

    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
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
            startedAt: startTime,
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
        "Direct peer-to-peer connection could not be established.\n\n" +
        "One of you is likely on a restricted network\n" +
        "(mobile data, university Wi-Fi, office firewall, etc).\n\n" +
        "Try switching networks or Wi-Fi."
    );


    setTimeout(() => window.location.href = '/', 3000);
}

function showReconnectOverlay(show) {
    const el = document.getElementById('reconnectOverlay');
    if (!el) return;
    el.classList.toggle('hidden', !show);
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resumeTimer() {
    if (!startTime || timerInterval) return;
    startTimer();
}

// ========================================
// PERFORMANCE: pause video when tab hidden
// ========================================

document.addEventListener("visibilitychange", () => {
    if (!localVideoTrack) return;

    if (document.hidden) localVideoTrack.enabled = false;
    else if (!isCameraOff) localVideoTrack.enabled = true;
});

// ========================================
// QUALITY MONITOR
// ========================================

function startQualityMonitor() {
    if (qualityInterval) return;

    qualityInterval = setInterval(async () => {
        try {
            const stats = await peerConnection.getStats();
            let rtt = null;

            stats.forEach(report => {
                if (
                    report.type === "candidate-pair" &&
                    report.state === "succeeded" &&
                    report.currentRoundTripTime
                ) {
                    rtt = report.currentRoundTripTime;
                }
            });

            const el = document.getElementById("quality");
            if (!el || rtt === null) return;

            if (rtt < 0.1) el.textContent = "Connection: Good";
            else if (rtt < 0.25) el.textContent = "Connection: Weak";
            else el.textContent = "Connection: Unstable";

        } catch (e) {
            console.warn("Stats error", e);
        }
    }, 3000);
}

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
