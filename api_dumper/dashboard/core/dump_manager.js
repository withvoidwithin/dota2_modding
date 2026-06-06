const fs = require("fs");
const path = require("path");
const netcon = require("./netcon");

const DATA_ROOT = path.resolve(__dirname, "../../..", process.env.DATA_PATH);
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
            saveDump(moduleName, result);
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

function saveDump(moduleName, result) {
    const dir = path.join(DATA_ROOT, moduleName);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "data.json"), JSON.stringify(result, null, 2), "utf8");
}

module.exports = { startDump, addListener };