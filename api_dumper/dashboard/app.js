function updateStatus(id, online) {
    const el = document.getElementById(id);
    el.textContent = online ? "ONLINE" : "OFFLINE";
    el.className = "status " + (online ? "online" : "offline");
}

function poll() {
    fetch("/api/processes")
        .then(res => res.json())
        .then(data => {
            updateStatus("status-dota", data.dota);
            updateStatus("status-vconsole", data.vconsole);
            updateStatus("status-netcon", data.netcon);

            const bothOnline = data.dota && data.vconsole;
            document.getElementById("btn-launch").disabled = bothOnline;
        });
}

function launchAll() {
    fetch("/api/launch/dota", { method: "POST" });
    fetch("/api/launch/vconsole", { method: "POST" });
}

function appendLog(text) {
    const log = document.getElementById("netcon-log");
    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

const sse = new EventSource("/api/netcon/stream");
sse.onmessage = (e) => {
    const event = JSON.parse(e.data);
    if (event.type === "log") appendLog(event.text);
};

poll();
setInterval(poll, 1000);

document.getElementById("cmd-input").addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const input = e.target;
    const command = input.value.trim();
    if (!command) return;
    fetch("/api/netcon/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
    });
    input.value = "";
});