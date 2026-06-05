const { spawn } = require("child_process");
const path = require("path");

const DOTA_PATH        = process.env.DOTA_PATH;
const DOTA_NETCON_PORT = process.env.DOTA_NETCON_PORT;
const DOTA_ADDON_NAME  = process.env.DOTA_ADDON_NAME;

const PATH_DOTA_EXE     = path.join(DOTA_PATH, "game", "bin", "win64", "dota2.exe");
const PATH_VCONSOLE_EXE = path.join(DOTA_PATH, "game", "bin", "win64", "vconsole2.exe");

const DOTA_EXE_ARGS = [
  "-dev",
  "-tools",
  "-insecure",
  "-console",
  "-novid",
  "-netconport", DOTA_NETCON_PORT,
  "-addon",      DOTA_ADDON_NAME,
];

function launchDota() {
  spawn(PATH_DOTA_EXE, DOTA_EXE_ARGS, { detached: true, stdio: "ignore" }).unref();
}

function launchVconsole() {
  spawn(PATH_VCONSOLE_EXE, [], { detached: true, stdio: "ignore" }).unref();
}

module.exports = { launchDota, launchVconsole };