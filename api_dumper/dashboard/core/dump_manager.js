const fs = require("fs");
const path = require("path");
const netcon = require("./netcon");

const { DATA_DIR, MANIFEST_PATH } = require("../../../config");
const listeners = new Set();

let session = null;

function emitDumpEvent(event) {
    listeners.forEach(fn => fn(event));
}

function addListener(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

function startDump(module) {
    if (session) return { ok: false, error: "Dump already in progress" };

    const tag = `${process.env.CONSOLE_TAG}:${process.env.CONSOLE_SUBTAG_DASHBOARD}`;

    session = {
        module: module.name,
        lines: [],
        collecting: false,
        startMarker: `${tag} DUMP_START:${module.name}`,
        endMarker: `${tag} DUMP_END:${module.name}`,
    };

    const removeNetconListener = netcon.addListener((event) => {
        if (event.type !== "log") return;
        const line = event.text.trim();

        if (line.includes(session.startMarker)) {
            session.collecting = true;
            emitDumpEvent({ type: "dump_start", module: session.module });
            return;
        }

        if (line.includes(session.endMarker)) {
            const lines = session.lines;
            const moduleName = session.module;
            session = null;
            removeNetconListener();

            const result = module.process(lines);
            result.meta.outputPath = module.outputPath;
            result.meta.layout = module.layout ?? null;
            saveDump(module, result);
            emitDumpEvent({ type: "dump_end", module: moduleName, count: result.meta.count });
            return;
        }

        if (session && session.collecting) {
            session.lines.push(line);
        }
    });

    netcon.send(`echo ${session.startMarker}`);
    netcon.send(module.command);
    netcon.send(`echo ${session.endMarker}`);

    return { ok: true };
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

module.exports = { startDump, addListener };