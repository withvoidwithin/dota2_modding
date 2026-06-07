const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// ── Репозиторий ────────────────────────────────────────────────
const REPO_RAW = "https://raw.githubusercontent.com/withvoidwithin/dota2_modding/assembler";

// ── Исключения (поддерживаются: точные пути, папки, glob * и **) ──
const EXCLUDE = [
    // IDE настройки
    ".vscode/**",
    ".idea/**",

    // служебные
    ".git",
    ".git/**",
    "node_modules",
    "node_modules/**",
    "**/node_modules/**",

    // зависимости и локи
    "**/package-lock.json",

    // данные дампов (генерируются автоматически)
    "data/**",
    "docs/data/**",

    // кеш аддона
    "dota_addon/**/*.bin",
    "dota_addon/**/*.sqlite3",

    // бинарные файлы аддона
    "dota_addon/game/maps/**",
    "dota_addon/content/maps/**",
];

// ── Утилиты ────────────────────────────────────────────────────

function globToRegex(pattern) {
    // Экранируем спецсимволы кроме * и ?
    let reStr = pattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, "__DOUBLE__")
        .replace(/\*/g, "[^/]*")
        .replace(/__DOUBLE__/g, ".*");
    return new RegExp("^" + reStr + "(/.*)?$");
}

const excludeRegexes = EXCLUDE.map(globToRegex);

function isExcluded(relPath) {
    const normalized = relPath.replace(/\\/g, "/");
    return excludeRegexes.some(re => re.test(normalized));
}

function collectFiles(dir, root, results = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(root, fullPath).replace(/\\/g, "/");

        if (isExcluded(relPath)) continue;

        if (entry.isDirectory()) {
            collectFiles(fullPath, root, results);
        } else {
            results.push(relPath);
        }
    }
    return results;
}

function copyToClipboard(text) {
    const proc = spawn("clip");
    proc.stdin.write(text);
    proc.stdin.end();
}

// ── Главная логика ─────────────────────────────────────────────

const ROOT = path.join(__dirname, "..");
const files = collectFiles(ROOT, ROOT);
const links = files.map(f => `${REPO_RAW}/${f}`);
const result = links.join("\n");

copyToClipboard(result);

console.log(`Скопировано ${links.length} ссылок:\n`);
links.forEach(l => console.log(l));