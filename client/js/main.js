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
    // Display user's short ID
    userIdDisplay.textContent = getShortId();
    
    // Load and render call history
    renderCallHistory();
    
    // Attach event listener
    createCallBtn.addEventListener('click', handleCreateCall);
}

// ========================================
// CREATE CALL
// ========================================

async function handleCreateCall() {
    try {
        // Disable button
        createCallBtn.disabled = true;
        createCallBtn.textContent = 'Creating...';
        
        // Request invite token from server
        const response = await fetch('/api/create-invite', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to create invite');
        }
        
        const data = await response.json();
        const token = data.token;
        
        // Redirect to call page
        window.location.href = `/call/${token}`;
        
    } catch (error) {
        console.error('Error creating call:', error);
        alert('Failed to create call. Please try again.');
        
        // Re-enable button
        createCallBtn.disabled = false;
        createCallBtn.textContent = 'Create Call Link';
    }
}

// ========================================
// RENDER CALL HISTORY
// ========================================

function renderCallHistory() {
    const calls = loadCalls();
    
    if (calls.length === 0) {
        callHistoryList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
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
            <div class="bg-gray-800 p-4 rounded-lg hover:bg-gray-750 transition">
                <div class="flex justify-between items-start mb-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">${icon}</span>
                        <div>
                            <div class="font-semibold">${directionText}</div>
                            <div class="text-xs text-gray-400">Peer: ${call.peer}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-300">${durationStr}</div>
                        <div class="text-xs text-gray-500">${dateStr}</div>
                        <div class="text-xs text-gray-500">${timeStr}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ========================================
// START
// ========================================

init();