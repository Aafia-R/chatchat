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

        const response = await fetch('/invite', {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('Failed to create invite');
        }

        const data = await response.json();
        const token = data.token;

        const callURL = `${window.location.origin}/call/${token}`;

        showShareLink(callURL);

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

    container.classList.remove('hidden');
    input.value = url;

    copyBtn.onclick = async () => {
        await navigator.clipboard.writeText(url);
        copyBtn.textContent = 'Copied';
        setTimeout(() => copyBtn.textContent = 'Copy', 1500);
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
        const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`;

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

document.addEventListener('DOMContentLoaded', init);
