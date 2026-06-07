const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../api_dumper/.env') });

// Путь к вашей папке Dota 2
const DOTA2_PATH = process.env.DOTA_PATH;
const ADDON_NAME = process.env.DOTA_ADDON_NAME;

// Исходные пути в вашем проекте (вычисляются автоматически относительно места запуска скрипта)
const CONTENT_SRC = path.resolve(__dirname, 'content');
const GAME_SRC = path.resolve(__dirname, 'game');

// Целевые пути в папке Dota 2, где игра ожидает файлы
const CONTENT_DEST = path.join(DOTA2_PATH, 'content', 'dota_addons', ADDON_NAME);
const GAME_DEST = path.join(DOTA2_PATH, 'game', 'dota_addons', ADDON_NAME);

function createJunction(src, dest) {
    // 1. Убедимся, что исходная папка в репозитории существует
    if (!fs.existsSync(src)) {
        fs.mkdirSync(src, { recursive: true });
        console.log(`[Инфо] Создана отсутствующая локальная папка: ${src}`);
    }

    // 2. Убедимся, что родительский каталог в Dota 2 существует (например, content/dota_addons)
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent)) {
        fs.mkdirSync(destParent, { recursive: true });
    }

    // 3. Проверим, существует ли уже что-то по целевому пути в Dota 2
    let stats = null;
    try {
        // Используем lstatSync, чтобы корректно определить даже "битые" символические ссылки
        stats = fs.lstatSync(dest);
    } catch (e) {
        // Ошибка означает, что папки или ссылки по этому пути нет, это нормально
    }

    if (stats) {
        if (stats.isSymbolicLink()) {
            // Если это старый симлинк/джанкшен, мы можем безопасно его удалить и перезаписать
            console.log(`[Инфо] Обнаружена старая связь по адресу ${dest}. Перезаписываем...`);
            fs.unlinkSync(dest);
        } else if (stats.isDirectory()) {
            // Если это реальная папка (с файлами), предупреждаем пользователя во избежание потери данных
            console.error(`\n[Предупреждение] В каталоге Dota 2 по пути:`);
            console.error(`"${dest}"`);
            console.error(`уже существует реальная папка. Чтобы не стереть ваши файлы, скрипт остановлен.`);
            console.error(`Пожалуйста, переименуйте или удалите эту папку вручную в проводнике, затем запустите скрипт снова.\n`);
            return;
        }
    }

    // 4. Создаем связь типа 'junction'
    try {
        fs.symlinkSync(src, dest, 'junction');
        console.log(`[Успех] Создана связь:`);
        console.log(`        Куда:   ${dest}`);
        console.log(`        Откуда: ${src}\n`);
    } catch (error) {
        console.error(`[Ошибка] Не удалось создать связь для ${dest}:`, error.message);
    }
}

console.log('--- Запуск создания символических связей (Junctions) ---\n');
createJunction(CONTENT_SRC, CONTENT_DEST);
createJunction(GAME_SRC, GAME_DEST);
console.log('--- Процесс завершен ---');