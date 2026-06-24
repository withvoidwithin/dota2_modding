let config = {};

const api = {
    get: (url) => fetch(url).then(res => res.json()),
    post: (url, body) => fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
    }),
};

const sendCommand = (command) => api.post("/api/netcon/command", { command });
const startDump   = (moduleName) => api.post(`/api/dump/${moduleName}`);
const dumpButton  = (moduleName) => document.getElementById(`btn-dump-${moduleName.replace(/_/g, "-")}`);

boot();

async function boot() {
    config = await api.get("/api/config");
    renderDumpButtons(await api.get("/api/dumps"));
    init();
}

function renderDumpButtons(modules) {
    const panel = document.getElementById("dump-panel");
    modules.forEach(({ name }) => {
        const btn = document.createElement("button");
        btn.className = "btn-dump";
        btn.id = `btn-dump-${name.replace(/_/g, "-")}`;
        btn.textContent = name;
        btn.disabled = true;
        btn.addEventListener("click", () => startDump(name));
        panel.appendChild(btn);
    });
}

function updateStatus(id, online) {
    const el = document.getElementById(id);
    el.textContent = online ? "ONLINE" : "OFFLINE";
    el.className = "status " + (online ? "online" : "offline");
}

function applyNetconState(online) {
    updateStatus("status-netcon", online);
    document.getElementById("btn-launch-map").disabled = !online;
    document.querySelectorAll(".btn-dump").forEach(btn => {
        if (!btn.classList.contains("dumping")) btn.disabled = !online;
    });
}

function poll() {
    api.get("/api/processes")
        .then(data => {
            updateStatus("status-dota", data.dota);
            updateStatus("status-vconsole", data.vconsole);
            document.getElementById("btn-launch").disabled = data.dota && data.vconsole;
            applyNetconState(data.netcon);
        })
        .catch(() => {});
}

function launchAll() {
    api.post("/api/launch/dota");
    api.post("/api/launch/vconsole");
}

function launchMap() {
    sendCommand(`dota_launch_custom_game ${config.addonName} ${config.addonMapName}`);
}

// Incoming netcon lines are buffered and flushed once per animation frame, so a
// flood (e.g. cvarlist = thousands of lines) costs one DOM insert + one reflow
// per frame instead of one synchronous reflow per line.
const LOG_MAX_LINES = 5000;
const logQueue = [];
let logFlushQueued = false;

function appendLog(text) {
    logQueue.push(text);
    if (logFlushQueued) return;
    logFlushQueued = true;
    requestAnimationFrame(flushLog);
}

function flushLog() {
    logFlushQueued = false;
    const log = document.getElementById("netcon-log");

    const frag = document.createDocumentFragment();
    for (const text of logQueue) frag.appendChild(buildLogLine(text));
    logQueue.length = 0;
    log.appendChild(frag);

    while (log.childElementCount > LOG_MAX_LINES) log.removeChild(log.firstChild);

    log.scrollTop = log.scrollHeight;
}

function buildLogLine(text) {
    const line = document.createElement("div");
    line.className = "log-line";

    const baseTag = config.consoleTag;

    if (baseTag && text.startsWith(baseTag)) {
        const spaceIdx = text.indexOf(" ");
        const fullTag = spaceIdx === -1 ? text : text.slice(0, spaceIdx);
        const rest    = spaceIdx === -1 ? ""   : text.slice(spaceIdx);

        const colonIdx = fullTag.indexOf(":");
        const tagBase  = colonIdx === -1 ? fullTag : fullTag.slice(0, colonIdx);
        const subtag   = colonIdx === -1 ? ""      : fullTag.slice(colonIdx + 1);

        const spanBase = document.createElement("span");
        spanBase.className = "tag-base";
        spanBase.textContent = tagBase;
        line.appendChild(spanBase);

        if (subtag) {
            const spanSub = document.createElement("span");
            if (subtag === config.consoleSubtagLua)            spanSub.className = "tag-lua";
            else if (subtag === config.consoleSubtagDashboard) spanSub.className = "tag-dash";
            spanSub.textContent = ":" + subtag;
            line.appendChild(spanSub);
        }

        if (rest) {
            const spanRest = document.createElement("span");
            spanRest.textContent = rest;
            line.appendChild(spanRest);
        }
    } else {
        line.textContent = text;
    }

    return line;
}

function init() {
    const sse = new EventSource("/api/netcon/stream");
    sse.onmessage = (e) => {
        const event = JSON.parse(e.data);

        if (event.type === "status") {
            applyNetconState(event.connected);
            return;
        }

        if (event.type === "log") {
            appendLog(event.text);
            return;
        }

        const btn = event.module && dumpButton(event.module);

        if (event.type === "dump_start") {
            if (btn) { btn.classList.add("dumping"); btn.disabled = true; }
        }

        if (event.type === "dump_end") {
            if (btn) btn.classList.remove("dumping");
            appendLog(`${config.consoleTag}:${config.consoleSubtagDashboard} DUMP ${event.module} — ${event.count} entries saved`);
        }

        if (event.type === "dump_error") {
            if (btn) btn.classList.remove("dumping");
            appendLog(`${config.consoleTag}:${config.consoleSubtagDashboard} DUMP ${event.module} FAILED — ${event.error}`);
        }
    };

    poll();
    setInterval(poll, 1000);

    document.getElementById("cmd-input").addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        const command = e.target.value.trim();
        if (!command) return;
        sendCommand(command);
        e.target.value = "";
    });
}
