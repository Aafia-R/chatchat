// ========================================
// HOME SCREEN LOGIC
// ========================================

const createCallBtn = document.getElementById('createCallBtn');
const callHistoryList = document.getElementById('callHistoryList');
const emptyState = document.getElementById('emptyState');
const userIdDisplay = document.getElementById('userIdDisplay');


// ========================================
// INIT
// ========================================

function init() {
    if (userIdDisplay) {
        userIdDisplay.textContent = getShortId();
    }

    renderCallHistory();

    if (createCallBtn) {
        createCallBtn.addEventListener('click', handleCreateCall);
    }
}


// ========================================
// CREATE CALL
// ========================================

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

        window.location.href = `/call/${token}`;

    } catch (error) {
        console.error('Error creating call:', error);
        alert('Failed to create call. Please try again.');

        createCallBtn.disabled = false;
        createCallBtn.textContent = 'Create Call Link';
    }
}


// ========================================
// RENDER CALL HISTORY
// ========================================

function renderCallHistory() {
    if (!callHistoryList) return;

    const calls = loadCalls();

    if (calls.length === 0) {
        callHistoryList.innerHTML = '<div class="text-gray-500 text-sm">No calls yet</div>';
        return;
    }

    callHistoryList.innerHTML = calls.map(call => {
        const date = new Date(call.startedAt);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();

        const durationMin = Math.floor(call.duration / 60);
        const durationSec = call.duration % 60;
        const durationStr = `${durationMin}:${String(durationSec).padStart(2, '0')}`;

        const icon = call.direction === 'outgoing' ? '📤' : '📥';
        const directionText = call.direction === 'outgoing' ? 'Outgoing' : 'Incoming';

        return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span>${icon}</span>
                        <div>
                            <div class="font-semibold">${directionText}</div>
                            <div class="text-xs text-gray-400">Peer: ${call.peer}</div>
                        </div>
                    </div>
                    <div class="text-right text-sm text-gray-400">
                        <div>${durationStr}</div>
                        <div>${dateStr}</div>
                        <div>${timeStr}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


// ========================================
// START
// ========================================

document.addEventListener('DOMContentLoaded', init);
