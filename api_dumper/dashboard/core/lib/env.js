const path = require("path");

// Single place that loads and validates api_dumper/.env. Every module imports
// the typed object below instead of reaching into process.env directly, so a
// missing key fails fast at startup with a clear message.
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });

function required(key) {
    const value = process.env[key];
    if (value === undefined || value === "") {
        throw new Error(`Missing required env variable: ${key} (check api_dumper/.env)`);
    }
    return value;
}

module.exports = {
    consoleTag:             required("CONSOLE_TAG"),
    consoleSubtagLua:       required("CONSOLE_SUBTAG_LUA"),
    consoleSubtagDashboard: required("CONSOLE_SUBTAG_DASHBOARD"),
    addonName:              required("DOTA_ADDON_NAME"),
    addonMapName:           required("DOTA_ADDON_MAP_NAME"),
    dotaPath:               required("DOTA_PATH"),
    netconPort:    Number(required("DOTA_NETCON_PORT")),
    serverPort:    Number(required("DASHBOARD_SERVER_PORT")),
};
