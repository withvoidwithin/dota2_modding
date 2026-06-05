const net = require("net");

const HOST = "127.0.0.1";
const RECONNECT_INTERVAL = 2000;

let socket = null;
let connected = false;
const listeners = new Set();

function getStatus() {
    return connected;
}

function send(command) {
    if (!connected || !socket) return false;
    socket.write(command + "\n");
    return true;
}

function addListener(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function emit(event) {
    listeners.forEach(fn => fn(event));
}

function tryConnect() {
    if (socket) return;

    const port = parseInt(process.env.DOTA_NETCON_PORT);
    socket = new net.Socket();

    socket.connect(port, HOST, () => {
        connected = true;
        emit({ type: "status", connected: true });
    });

    socket.on("data", (data) => {
        const lines = data.toString().split("\n");
        for (const line of lines) {
            if (line.trim()) emit({ type: "log", text: line.trim() });
        }
    });

    socket.on("close", () => {
        connected = false;
        socket = null;
        emit({ type: "status", connected: false });
        setTimeout(tryConnect, RECONNECT_INTERVAL);
    });

    socket.on("error", () => {
        socket.destroy();
    });
}

tryConnect();

module.exports = { getStatus, send, addListener };