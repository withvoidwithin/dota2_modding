const { spawn } = require("child_process");
const path = require("path");

const env = require("./lib/env");

const BIN_DIR = path.join(env.dotaPath, "game", "bin", "win64");
const PATH_DOTA_EXE = path.join(BIN_DIR, "dota2.exe");
const PATH_VCONSOLE_EXE = path.join(BIN_DIR, "vconsole2.exe");

const DOTA_EXE_ARGS = [
    "-dev",
    "-tools",
    "-insecure",
    "-console",
    "-novid",
    "-netconport", String(env.netconPort),
    "-addon", env.addonName,
];

function launchDetached(exe, args = []) {
    spawn(exe, args, { detached: true, stdio: "ignore" }).unref();
}

function launchDota() {
    launchDetached(PATH_DOTA_EXE, DOTA_EXE_ARGS);
}

function launchVconsole() {
    launchDetached(PATH_VCONSOLE_EXE);
}

module.exports = { launchDota, launchVconsole };
