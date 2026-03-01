import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOTA_PATH = process.env.DOTA_PATH;
const ADDON_NAME = 'api_dumper_mod';

// Источники в репозитории
const REPO_BASE = path.join(__dirname, '..', 'content', 'dota_addons', ADDON_NAME);
const REPO_GAME = path.join(REPO_BASE, 'game');
const REPO_CONTENT = path.join(REPO_BASE, 'content');

// Цели в Dota 2
const LINKS = [
    { src: REPO_GAME, dest: path.join(DOTA_PATH, 'game', 'dota_addons', ADDON_NAME) },
    { src: REPO_CONTENT, dest: path.join(DOTA_PATH, 'content', 'dota_addons', ADDON_NAME) }
];

console.log(chalk.blue('--- Establishing Split Symlinks (Game & Content) ---'));

if (!DOTA_PATH || !fs.existsSync(DOTA_PATH)) {
    console.error(chalk.red('[ERROR] Invalid DOTA_PATH in .env'));
    process.exit(1);
}

// Создаем папки в репо, если их еще нет
fs.ensureDirSync(REPO_GAME);
fs.ensureDirSync(REPO_CONTENT);

LINKS.forEach(({ src, dest }) => {
    try {
        if (fs.existsSync(dest)) {
            console.log(chalk.yellow(`[CLEANUP] Removing: ${dest}`));
            fs.removeSync(dest); // Удаляет старый симлинк или папку
        }

        fs.symlinkSync(src, dest, 'junction');
        console.log(chalk.green(`[SUCCESS] Linked: \n   ${src} \n   -> ${dest}`));
    } catch (err) {
        console.error(chalk.red(`[ERROR] Failed to link ${dest}:`), err.message);
    }
});