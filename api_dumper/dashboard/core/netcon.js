const net = require("net");

const env = require("./lib/env");
const createEmitter = require("./lib/emitter");

const HOST = "127.0.0.1";
const RECONNECT_INTERVAL = 2000;

const emitter = createEmitter();

let socket = null;
let connected = false;
let buffer = ""; // holds the trailing partial line between TCP chunks

function getStatus() {
    return connected;
}

function send(command) {
    if (!connected || !socket) return false;
    socket.write(command + "\n");
    return true;
}

function setConnected(value) {
    connected = value;
    emitter.emit({ type: "status", connected: value });
}

// TCP is a stream, not a line protocol — a single console line can arrive split
// across chunks. Buffer until we see a newline so log/marker matching is exact.
function handleData(chunk) {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
        const text = line.trim();
        if (text) emitter.emit({ type: "log", text });
    }
}

function tryConnect() {
    if (socket) return;

    socket = new net.Socket();
    socket.connect(env.netconPort, HOST, () => setConnected(true));
    socket.on("data", handleData);

    socket.on("close", () => {
        socket = null;
        buffer = "";
        setConnected(false);
        setTimeout(tryConnect, RECONNECT_INTERVAL);
    });

    socket.on("error", () => socket.destroy());
}

tryConnect();

module.exports = { getStatus, send, addListener: emitter.add };
