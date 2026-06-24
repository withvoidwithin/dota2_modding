const express = require("express");
const path = require("path");
const fs = require("fs");

const env = require("./lib/env");
const { checkProcesses } = require("./processes");
const { launchDota, launchVconsole } = require("./launcher");
const netcon = require("./netcon");
const dumpManager = require("./dump_manager");

// Dump modules are discovered from the folder — dropping a new file in dumps/
// auto-registers its route and exposes it to the dashboard via /api/dumps.
const dumpsDir = path.join(__dirname, "dumps");
const dumpModules = fs.readdirSync(dumpsDir)
    .filter(f => f.endsWith(".js"))
    .map(f => require(path.join(dumpsDir, f)));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

app.get("/api/config", (req, res) => {
    res.json({
        consoleTag: env.consoleTag,
        consoleSubtagLua: env.consoleSubtagLua,
        consoleSubtagDashboard: env.consoleSubtagDashboard,
        addonName: env.addonName,
        addonMapName: env.addonMapName,
    });
});

app.get("/api/dumps", (req, res) => {
    res.json(dumpModules.map(m => ({ name: m.name })));
});

app.get("/api/processes", (req, res) => {
    checkProcesses((err, status) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...status, netcon: netcon.getStatus() });
    });
});

app.post("/api/launch/dota", (req, res) => {
    checkProcesses((err, status) => {
        if (err) return res.status(500).json({ error: err.message });
        if (status.dota) return res.status(409).json({ error: "Dota 2 is already running" });
        launchDota();
        res.json({ ok: true });
    });
});

app.post("/api/launch/vconsole", (req, res) => {
    checkProcesses((err, status) => {
        if (err) return res.status(500).json({ error: err.message });
        if (status.vconsole) return res.status(409).json({ error: "VConsole is already running" });
        launchVconsole();
        res.json({ ok: true });
    });
});

app.post("/api/netcon/command", (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command" });
    if (!netcon.send(command)) return res.status(503).json({ error: "Netcon not connected" });
    res.json({ ok: true });
});

dumpModules.forEach(module => {
    app.post(`/api/dump/${module.name}`, (req, res) => {
        if (!netcon.getStatus()) return res.status(503).json({ error: "Netcon not connected" });
        const result = dumpManager.startDump(module);
        if (!result.ok) return res.status(409).json({ error: result.error });
        res.json({ ok: true });
    });
});

app.get("/api/netcon/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    send({ type: "status", connected: netcon.getStatus() });

    const unsubscribe = [netcon.addListener(send), dumpManager.addListener(send)];
    req.on("close", () => unsubscribe.forEach(fn => fn()));
});

app.listen(env.serverPort, () => {
    console.log(`http://localhost:${env.serverPort}`);
});
