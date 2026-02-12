// client/js/storage.js

// ========================================
// IDENTITY MANAGEMENT (LOCAL ONLY)
// ========================================

const IDENTITY_KEY = 'secure-call-identity';
const CALL_HISTORY_KEY = 'secure-call-history';

/**
 * Generate a cryptographic identity (once per browser)
 * Returns: base64 encoded random string
 */
function generateIdentity() {
    const array = new Uint8Array(32); // 256 bits
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}

/**
 * Get or create identity
 * Returns: identity string
 */
function getIdentity() {
    let identity = localStorage.getItem(IDENTITY_KEY);
    
    if (!identity) {
        identity = generateIdentity();
        localStorage.setItem(IDENTITY_KEY, identity);
    }
    
    return identity;
}

/**
 * Derive short hash from identity for display
 * Returns: 8-character hash
 */
function getShortId() {
    const identity = getIdentity();
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < identity.length; i++) {
        hash = ((hash << 5) - hash) + identity.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to base36 and take first 8 chars
    return Math.abs(hash).toString(36).substring(0, 8).toUpperCase();
}

// ========================================
// CALL HISTORY (LOCAL ONLY)
// ========================================

/**
 * Save a call to local history
 * @param {Object} entry - Call entry object
 * @param {string} entry.direction - "incoming" or "outgoing"
 * @param {number} entry.startedAt - Unix timestamp
 * @param {number} entry.duration - Duration in seconds
 * @param {string} entry.peer - Short hash of peer identity
 */
function saveCall(entry) {
    const history = loadCalls();
    
    // Add new entry at the beginning
    history.unshift({
        direction: entry.direction,
        startedAt: entry.startedAt,
        duration: entry.duration,
        peer: entry.peer
    });
    
    // Keep only last 50 calls
    const trimmed = history.slice(0, 50);
    
    localStorage.setItem(CALL_HISTORY_KEY, JSON.stringify(trimmed));
}

/**
 * Load call history from localStorage
 * Returns: Array of call entries
 */
function loadCalls() {
    const data = localStorage.getItem(CALL_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
}

/**
 * Clear all call history
 */
function clearHistory() {
    localStorage.removeItem(CALL_HISTORY_KEY);
}

/**
 * Clear identity (nuclear option - loses all identity)
 */
function clearIdentity() {
    localStorage.removeItem(IDENTITY_KEY);
}

// ========================================
// EXPORTS (if using modules) / GLOBAL
// ========================================

// Already available globally since this is vanilla JS
// No exports needed - functions are in global scope