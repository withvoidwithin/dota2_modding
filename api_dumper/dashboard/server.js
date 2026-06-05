require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const express = require("express");
const path = require("path");
const { checkProcesses } = require("./processes");
const { launchDota, launchVconsole } = require("./launcher");

const app = express();
const PORT = process.env.DASHBOARD_SERVER_PORT;

app.use(express.static(path.join(__dirname)));

app.get("/api/processes", (req, res) => {
  checkProcesses((err, status) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(status);
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

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});