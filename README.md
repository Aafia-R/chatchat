Welcome! This is a highly secure, privacy-first communication platform built for pure peer-to-peer (P2P) connections. It guarantees absolute control over your identity, your messages, and how your data is stored.

---

##  Detailed Plan

### What is it?
This project is a decentralized-style communication app for audio, video, and text. It removes the need for traditional accounts. Instead, your identity is a cryptographic key tied to your device. The server only exists to help devices find each other—it does not snoop, step in as a fallback, or control your data.

### Why does this exist?
Modern chat apps force you to use phone numbers, emails, and central servers that hold your data forever. This project exists to give power back to the user. You decide if a message can be saved offline, you control your identity keys, and there is zero central directory. If you don't share your contact code, you don't exist to the network.

### How is it different from available options?
1. **No Phone Numbers or Emails:** Your identity is just a secure key on your device. No server recovery means absolute privacy.
2. **Pure P2P (No Relay Fallback):** Audio and video go directly from you to your contact. If a direct connection can't be made, it fails securely rather than routing your call through a corporate server.
3. **Sender-Controlled Storage:** You decide if your messages can be held on a server for offline delivery, or if they must be delivered strictly P2P while the other person is online.
4. **No Public Discovery:** There is no global search directory. You can only connect via QR codes, direct contact codes, or one-time invite links.

---

##  Current Progress

**What is Done:**
* **Server Layer:** The base backend server is built and operational. It handles the initial handshakes and connection logic.

**What is In Progress:**
* **1-to-1 Audio Calls:** Currently building the pure P2P audio calling feature to allow secure voice connections.

---

##  Roadmap (What is Remaining)

Here are the features planned for the future, in order of development:

### Audio & Video Core
* **Video & Push-to-Talk (PTT):** Adding video streams and walkie-talkie style PTT.
* **Keyboard Shortcuts:** Quick keys to toggle mic, video, and PTT.
* *(Note: All calls will remain Pure P2P. There will be no server relay fallback).*

### Live Text Messaging
* **Basic P2P Text:** 1-to-1 encrypted text messaging that works strictly when both users are online (no offline storage rules yet).

### Identity Control
* **Key-Based Identity:** Device-based cryptographic keys become your identity.
* **Local Security:** Optional local PIN to open the app.
* **Zero Recovery:** No server-side account recovery (maximum security).

### Adding Contacts
* **Secure Exchange:** Add friends via QR code exchange, manual contact code exchange, or one-time invite links.
* **Optional Verification:** Verify the person you are talking to is really them.
* **Hidden by Default:** No user discovery and no central contact directory.

### Offline Messaging & Storage Control
* **Sender-Controlled Routing:** The sender decides how a message is handled.
    * *Allowed:* Message is encrypted and held on the server until the friend comes online.
    * *Disallowed:* Message is held strictly on the sender's device and delivered P2P later.
* **Global Defaults:** Users can set a default rule for offline storage, or have the app ask them every time.
* **Expiration:** Messages self-destruct on both devices and the server.
* **Server Auto-Delete:** The server automatically scrubs undelivered offline messages after 7–10 days.

### Media Sharing
* **File & Media Sending:** Share photos and files with the exact same sender-controlled storage logic.
* **Encrypted Local Storage:** Files are kept safely encrypted on your actual device.

### Groups & Broadcasting
* **Group Chats:** Encrypted text chat for multiple people.







