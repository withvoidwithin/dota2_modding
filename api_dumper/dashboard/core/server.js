require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });

const express = require("express");
const path = require("path");
const { checkProcesses } = require("./processes");
const { launchDota, launchVconsole } = require("./launcher");
const netcon = require("./netcon");

const app = express();
const PORT = process.env.DASHBOARD_SERVER_PORT;

app.use(express.static(path.join(__dirname, "..")));

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

app.post("/api/netcon/command", express.json(), (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "No command" });
    const ok = netcon.send(command);
    if (!ok) return res.status(503).json({ error: "Netcon not connected" });
    res.json({ ok: true });
});

app.get("/api/netcon/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: "status", connected: netcon.getStatus() })}\n\n`);

    const remove = netcon.addListener((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", remove);
});

app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});