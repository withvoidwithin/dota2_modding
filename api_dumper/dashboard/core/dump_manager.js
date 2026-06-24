const fs = require("fs");
const path = require("path");

const netcon = require("./netcon");
const env = require("./lib/env");
const createEmitter = require("./lib/emitter");
const { DATA_DIR, MANIFEST_PATH } = require("../../../config");

// Hard cap so a dump that never sees its end marker (netcon hiccup, no output)
// can't block every future dump forever.
const DUMP_TIMEOUT = 60000;

const emitter = createEmitter();

let session = null;

// Tears down the active session and releases its netcon listener + timer.
function clearSession() {
    if (!session) return;
    clearTimeout(session.timer);
    session.removeListener();
    session = null;
}

function startDump(module) {
    if (session) return { ok: false, error: "Dump already in progress" };
    if (!netcon.getStatus()) return { ok: false, error: "Netcon not connected" };

    const tag = `${env.consoleTag}:${env.consoleSubtagDashboard}`;

    session = {
        module: module.name,
        lines: [],
        collecting: false,
        startMarker: `${tag} DUMP_START:${module.name}`,
        endMarker: `${tag} DUMP_END:${module.name}`,
        removeListener: null,
        timer: null,
    };

    session.removeListener = netcon.addListener(onEvent);
    session.timer = setTimeout(() => abort("Dump timed out"), DUMP_TIMEOUT);

    function onEvent(event) {
        if (event.type === "status" && !event.connected) return abort("Netcon disconnected");
        if (event.type !== "log" || !session) return;

        const line = event.text;

        if (line.includes(session.startMarker)) {
            session.collecting = true;
            emitter.emit({ type: "dump_start", module: session.module });
            return;
        }

        if (line.includes(session.endMarker)) {
            const lines = session.lines;
            const moduleName = session.module;
            clearSession();
            finish(module, lines, moduleName);
            return;
        }

        if (session.collecting) session.lines.push(line);
    }

    netcon.send(`echo ${session.startMarker}`);
    netcon.send(module.command);
    netcon.send(`echo ${session.endMarker}`);

    return { ok: true };
}

function abort(reason) {
    if (!session) return;
    const moduleName = session.module;
    clearSession();
    emitter.emit({ type: "dump_error", module: moduleName, error: reason });
}

function finish(module, lines, moduleName) {
    const result = module.process(lines);
    result.meta.outputPath = module.outputPath;
    result.meta.layout = module.layout ?? null;
    saveDump(module, result);
    emitter.emit({ type: "dump_end", module: moduleName, count: result.meta.count });
}

function saveDump(module, result) {
    const filePath = path.join(DATA_DIR, module.outputPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8");
    updateManifest(module);
}

function updateManifest(module) {
    let manifest = [];
    try {
        manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    } catch {}

    const entry = {
        label:    module.name,
        dataPath: module.outputPath,
        layout:   module.layout ?? null,
    };

    const idx = manifest.findIndex(e => e.dataPath === module.outputPath);
    if (idx >= 0) manifest[idx] = entry;
    else manifest.push(entry);

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
}

module.exports = { startDump, addListener: emitter.add };
