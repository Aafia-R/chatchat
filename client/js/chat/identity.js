// Uses your existing storage.js identity

function getPeerId() {
    return getShortId();   // already exists in storage.js
}

document.addEventListener("DOMContentLoaded", () => {
    const el = document.getElementById("myId");
    if (el) el.textContent = getPeerId();
});