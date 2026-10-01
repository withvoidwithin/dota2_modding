// Connects the bundled Dota 2 VScripts annotations to EmmyLua (Tangzx) through its global config.
// The setting emmylua.ls.globalConfigPath points to a .emmyrc.json in this extension's storage that adds the
// annotations folder to workspace.library. EmmyLua merges workspace.library of the global and the project
// config, so a project keeps its own .emmyrc.json. A global config the user had before is taken as the base
// of ours and comes back with the Disconnect command.
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

const SECTION = "emmylua";
const SETTING = "ls.globalConfigPath";
// Global config path the user had before we pointed the setting at ours; "" — none.
const ORIGINAL_KEY = "originalGlobalConfigPath";
const DISCONNECTED_KEY = "disconnected";

/** @param {vscode.ExtensionContext} context */
async function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("dota2VscriptsAnnotations.connect", () => run(() => connect(context, true))),
    vscode.commands.registerCommand("dota2VscriptsAnnotations.disconnect", () => run(() => disconnect(context))),
  );
  if (!context.globalState.get(DISCONNECTED_KEY)) await run(() => connect(context, false));
}

/** @param {vscode.ExtensionContext} context @param {boolean} explicit */
async function connect(context, explicit) {
  await context.globalState.update(DISCONNECTED_KEY, false);
  const config = vscode.workspace.getConfiguration(SECTION);
  const ours = path.join(context.globalStorageUri.fsPath, "emmyrc.json");
  const current = config.inspect(SETTING)?.globalValue ?? "";
  if (current !== ours) await context.globalState.update(ORIGINAL_KEY, current);

  const original = context.globalState.get(ORIGINAL_KEY) ?? "";
  const base = original ? readJson(original) : {};
  if (base === undefined) {
    vscode.window.showErrorMessage(`Dota 2 VScripts Annotations: cannot read ${original} as JSON; annotations not connected.`);
    return;
  }
  const annotations = path.join(context.extensionPath, "annotations", "lua");
  const library = (base.workspace?.library ?? []).filter((entry) => !isOurs(context, entry));
  const text = JSON.stringify({ ...base, workspace: { ...base.workspace, library: [...library, annotations] } }, null, 2) + "\n";

  const changed = writeIfChanged(ours, text) || current !== ours;
  if (current !== ours) await config.update(SETTING, ours, vscode.ConfigurationTarget.Global);
  const workspaceValue = config.inspect(SETTING)?.workspaceValue;
  if (workspaceValue && workspaceValue !== ours) {
    vscode.window.showWarningMessage(`Dota 2 VScripts Annotations: the workspace sets ${SECTION}.${SETTING}, which overrides the annotations.`);
  }
  if (changed) await restartEmmyLua();
  if (explicit) vscode.window.showInformationMessage("Dota 2 VScripts Annotations: connected.");
}

/** @param {vscode.ExtensionContext} context */
async function disconnect(context) {
  const original = context.globalState.get(ORIGINAL_KEY) ?? "";
  await vscode.workspace.getConfiguration(SECTION).update(SETTING, original || undefined, vscode.ConfigurationTarget.Global);
  await context.globalState.update(DISCONNECTED_KEY, true);
  await restartEmmyLua();
  vscode.window.showInformationMessage("Dota 2 VScripts Annotations: disconnected. Connect again with the Connect annotations command.");
}

/** A library entry left by another version of this extension. */
function isOurs(context, entry) {
  return typeof entry === "string" && entry.toLowerCase().includes(context.extension.id.toLowerCase());
}

/** @returns {object | undefined} parsed JSON, {} for a missing file, undefined if unreadable */
function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return error.code === "ENOENT" ? {} : undefined;
  }
}

/** @returns {boolean} whether the file was (re)written */
function writeIfChanged(file, text) {
  try {
    if (fs.readFileSync(file, "utf8") === text) return false;
  } catch {
    // missing: write it
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return true;
}

/** EmmyLua reads its global config when its server starts. */
async function restartEmmyLua() {
  try {
    await vscode.commands.executeCommand("emmy.restartServer");
  } catch {
    // EmmyLua not started yet: it picks the config up when it starts.
  }
}

async function run(action) {
  try {
    await action();
  } catch (error) {
    vscode.window.showErrorMessage(`Dota 2 VScripts Annotations: ${error.message}`);
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
