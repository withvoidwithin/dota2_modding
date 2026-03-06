import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '../website/src');
const DIST = path.join(__dirname, '../website/dist');
const JSON_DATA = path.join(__dirname, '../data/raw/modifiers.json');

// 1. Очистка и создание dist
if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
fs.mkdirSync(DIST);

// 2. Копирование статики
fs.copyFileSync(path.join(SRC, 'index.html'), path.join(DIST, 'index.html'));
fs.copyFileSync(path.join(SRC, 'style.css'), path.join(DIST, 'style.css'));

// 3. Инъекция данных в app.js и копирование
const modifiers = JSON.parse(fs.readFileSync(JSON_DATA, 'utf-8'));
const appJs = fs.readFileSync(path.join(SRC, 'app.js'), 'utf-8');
const outputJs = `window.DATA = ${JSON.stringify(modifiers)};\n\n${appJs}`;
fs.writeFileSync(path.join(DIST, 'app.js'), outputJs);

console.log('[SUCCESS] Сайт успешно собран в website/dist/');