function addMessageToUI(msg, mine = false) {
    const box = document.getElementById("messages");
    if (!box) return;

    const row = document.createElement("div");

    const name = mine ? "Me" : msg.name;
    const time = new Date(msg.ts).toLocaleTimeString();

    row.innerHTML = `<b>${name}</b> (${time}): ${msg.text}`;
    box.appendChild(row);

    box.scrollTop = box.scrollHeight;
}


function handleSend() {
    const input = document.getElementById("msg");
    if (!input) return;

    const text = input.value.trim();
    if (!text) return;

    sendChat(text);
    input.value = "";
}


document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("sendBtn");
    if (btn) btn.addEventListener("click", handleSend);
});