const DB_NAME = "chat_db";
const DB_VERSION = 1;

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (event) => {
            const db = event.target.result;

            // message history store
            if (!db.objectStoreNames.contains("messages")) {
                const store = db.createObjectStore("messages", { keyPath: "id" });
                store.createIndex("session", "sessionId", { unique: false });
            }

            // outgoing queue store
            if (!db.objectStoreNames.contains("queue")) {
                const store = db.createObjectStore("queue", { keyPath: "id" });
                store.createIndex("session", "sessionId", { unique: false });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    return dbPromise;
}


// SAVE MESSAGE TO HISTORY
async function saveMessage(msg) {
    const db = await openDB();
    const tx = db.transaction("messages", "readwrite");
    tx.objectStore("messages").put(msg);
}


// LOAD HISTORY
async function loadMessages(sessionId) {
    const db = await openDB();
    const tx = db.transaction("messages", "readonly");
    const store = tx.objectStore("messages").index("session");

    return new Promise((resolve, reject) => {
        const req = store.getAll(sessionId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
}


// ADD MESSAGE TO OUTGOING QUEUE
async function queueMessage(msg) {
    const db = await openDB();
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put(msg);
}


// LOAD OUTGOING QUEUE
async function loadQueue(sessionId) {
    const db = await openDB();
    const tx = db.transaction("queue", "readonly");
    const store = tx.objectStore("queue").index("session");

    return new Promise((resolve, reject) => {
        const req = store.getAll(sessionId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = reject;
    });
}


// REMOVE MESSAGE FROM QUEUE AFTER DELIVERY
async function removeFromQueue(id) {
    const db = await openDB();
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").delete(id);
}