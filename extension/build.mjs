#!/usr/bin/env node
// Packages the extension: copies the annotations and the license from the repository, sets the version from
// the game build of the dump (1.<clientVersion>.<patch>; the patch restarts at 0 for a new game build) and runs
// vsce. The .vsix goes to dist/.
//
// usage: node extension/build.mjs
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repository = join(here, "..");

rmSync(join(here, "annotations"), { recursive: true, force: true });
cpSync(join(repository, "annotations", "lua"), join(here, "annotations", "lua"), { recursive: true });
cpSync(join(repository, "LICENSE"), join(here, "LICENSE"));

const manifestPath = join(here, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const gameBuild = JSON.parse(readFileSync(join(repository, "data", "vscripts", "server.json"), "utf8")).build.clientVersion;
const [, minor, patch] = manifest.version.split(".");
const version = `1.${gameBuild}.${minor === gameBuild ? patch : 0}`;
if (version !== manifest.version) {
  manifest.version = version;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}

mkdirSync(join(here, "dist"), { recursive: true });
const out = join(here, "dist", `${manifest.name}-${version}.vsix`);
const result = spawnSync("npx", ["--yes", "@vscode/vsce@3", "package", "--out", out], {
  cwd: here,
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
