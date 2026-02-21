const createCallBtn = document.getElementById('createCallBtn');
const callHistoryList = document.getElementById('callHistoryList');

function init() {
    renderCallHistory();

    if (createCallBtn) {
        createCallBtn.addEventListener('click', handleCreateCall);
    }
}

async function handleCreateCall() {
    try {
        createCallBtn.disabled = true;
        createCallBtn.textContent = 'Creating...';

        const ttlSelect = document.getElementById('expirySelect');
        const ttl = ttlSelect ? parseInt(ttlSelect.value) : 300;

        const oneTime =
            document.getElementById('oneTimeInvite')?.checked ? 1 : 0;

        const response = await fetch('/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ttl, one_time: oneTime })
        });

        if (!response.ok) {
            throw new Error('Failed to create invite');
        }

        const data = await response.json();
        const token = data.token;

        const callURL = `${window.location.origin}/call/${token}`;

        showShareLink(callURL);
        startExpiryCountdown(data.expires_in);

        // Keep button locked while link exists
        createCallBtn.textContent = 'Link Created';

    } catch (error) {
        console.error(error);
        alert('Failed to create call.');

        createCallBtn.disabled = false;
        createCallBtn.textContent = 'Create Call Link';
    }
}

function showShareLink(url) {
    const container = document.getElementById('linkContainer');
    const input = document.getElementById('callLink');
    const copyBtn = document.getElementById('copyLink');
    const joinBtn = document.getElementById('joinCall');

    const expiryControls = document.getElementById('expiryControls');
    if (expiryControls) expiryControls.classList.add('hidden');


    container.classList.remove('hidden');
    input.value = url;

    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(url);
            copyBtn.textContent = 'Copied';
            setTimeout(() => copyBtn.textContent = 'Copy', 1500);
        } catch {
            alert('Copy failed — select and copy manually.');
        }
    };

    joinBtn.onclick = () => {
        window.location.href = url;
    };
}

function renderCallHistory() {
    if (!callHistoryList) return;

    const calls = loadCalls();

    if (calls.length === 0) {
        callHistoryList.innerHTML =
            '<div class="text-gray-500 text-sm">No calls yet</div>';
        return;
    }

    callHistoryList.innerHTML = calls.map(call => {
        const date = new Date(call.startedAt);
        const durationMin = Math.floor(call.duration / 60);
        const durationSec = call.duration % 60;
        const durationStr =
            `${durationMin}:${String(durationSec).padStart(2, '0')}`;

        return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between">
                    <div>
                        <div class="font-semibold">${call.direction}</div>
                        <div class="text-xs text-gray-400">${date.toLocaleString()}</div>
                    </div>
                    <div class="text-sm text-gray-300">
                        ${durationStr}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function startExpiryCountdown(seconds) {
    const el = document.getElementById('expiryTimer');
    const container = document.getElementById('linkContainer');
    if (!el) return;

    const expiryTime = Date.now() + (seconds * 1000);

    function tick() {
        const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));

        // EXPIRED
        if (remaining <= 0) {
            el.textContent = "Link expired";

            const expiryControls = document.getElementById('expiryControls');
            if (expiryControls) expiryControls.classList.remove('hidden');

            if (createCallBtn) {
                createCallBtn.disabled = false;
                createCallBtn.textContent = 'Create Call Link';
            }

            setTimeout(() => {
                const container = document.getElementById('linkContainer');
                if (container) container.classList.add('hidden');
            }, 1200);

            return;
        }


        const m = Math.floor(remaining / 60);
        const s = remaining % 60;

        el.textContent =
            `Link expires in ${m}:${String(s).padStart(2, '0')}`;

        // RESET STYLES
        el.classList.remove('text-red-500', 'animate-pulse');

        // TURN RED AT 30s
        if (remaining <= 30) {
            el.classList.add('text-red-500');
        }

        // PULSE AT 10s
        if (remaining <= 10) {
            el.classList.add('animate-pulse');
        }

        setTimeout(tick, 250);
    }

    tick();
}

document.addEventListener('DOMContentLoaded', init);
