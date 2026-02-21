// Handles session id, password, and user name

function getSessionFromURL() {
    const params = new URLSearchParams(window.location.search);

    return {
        sessionId: params.get("s"),
        password: params.get("p")
    };
}


function getUserName() {
    let name = localStorage.getItem("chat_name");

    if (!name) {
        name = prompt("Enter your name:");
        if (!name) name = "Anonymous";

        localStorage.setItem("chat_name", name);
    }

    return name;
}


function getSessionInfo() {
    const { sessionId, password } = getSessionFromURL();

    if (!sessionId || !password) {
        alert("Invalid chat link");
        window.location.href = "/";
        return null;
    }

    return {
        sessionId,
        password,
        name: getUserName()
    };
}