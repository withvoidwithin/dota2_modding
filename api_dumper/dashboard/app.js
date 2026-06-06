let config = {};

fetch("/api/config")
    .then(res => res.json())
    .then(data => {
        config = data;
        init();
    });

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

            document.getElementById("btn-launch").disabled = data.dota && data.vconsole;

            document.querySelectorAll(".btn-dump").forEach(btn => {
                if (!btn.classList.contains("dumping")) {
                    btn.disabled = !data.netcon;
                }
            });
        });
}

function launchAll() {
    fetch("/api/launch/dota", { method: "POST" });
    fetch("/api/launch/vconsole", { method: "POST" });
}

function startDump(moduleName) {
    fetch(`/api/dump/${moduleName}`, { method: "POST" });
}

function appendLog(text) {
    const log = document.getElementById("netcon-log");
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
            if (subtag === config.consoleSubtagLua)       spanSub.className = "tag-lua";
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

    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

function init() {
    const sse = new EventSource("/api/netcon/stream");
    sse.onmessage = (e) => {
        const event = JSON.parse(e.data);

        if (event.type === "log") {
            appendLog(event.text);
        }

        if (event.type === "dump_start") {
            const btn = document.getElementById(`btn-dump-${event.module.replace(/_/g, "-")}`);
            if (btn) {
                btn.classList.add("dumping");
                btn.disabled = true;
            }
        }

        if (event.type === "dump_end") {
            const btn = document.getElementById(`btn-dump-${event.module.replace(/_/g, "-")}`);
            if (btn) {
                btn.classList.remove("dumping");
            }
            appendLog(`${config.consoleTag}:${config.consoleSubtagDashboard} DUMP ${event.module} — ${event.count} entries saved`);
        }
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
}