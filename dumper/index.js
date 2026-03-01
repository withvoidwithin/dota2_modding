import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { spawn, exec } from 'child_process';
import { VConsoleClient } from './vconsole.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

// --- ИМПОРТ МОДУЛЕЙ ---
import * as ModifiersDumper from './modules/modifiers.js';

// Делаем exec асинхронным для удобства
const execAsync = promisify(exec);
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOTA_PATH = process.env.DOTA_PATH;
const ADDON_NAME = 'api_dumper_mod';

if (!DOTA_PATH) {
    console.error(chalk.red('[ERROR] DOTA_PATH not found in .env'));
    process.exit(1);
}

// Формируем пути
const DOTA_EXE = path.join(DOTA_PATH, 'game', 'bin', 'win64', 'dota2.exe');
const VCONSOLE_EXE = path.join(DOTA_PATH, 'game', 'bin', 'win64', 'vconsole2.exe');

// Проверка существования файлов
if (!fs.existsSync(DOTA_EXE)) {
    console.error(chalk.red(`[ERROR] Executable not found: ${DOTA_EXE}`));
    process.exit(1);
}

if (!fs.existsSync(VCONSOLE_EXE)) {
    console.error(chalk.red(`[ERROR] VConsole executable not found: ${VCONSOLE_EXE}`));
    process.exit(1);
}

// Функция проверки запущенного процесса (Windows)
async function isProcessRunning(processName) {
    try {
        const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${processName}"`);
        return stdout.toLowerCase().includes(processName.toLowerCase());
    } catch (err) {
        console.error(chalk.red(`[ERROR] Failed to check process ${processName}:`, err.message));
        return false;
    }
}

// Запуск приложения отвязанным от консоли
function launchDetached(executable, args = []) {
    const proc = spawn(executable, args, {
        detached: true,
        stdio: 'ignore'
    });
    proc.unref();
}

async function connectToVConsole() {
    const vconsole = new VConsoleClient(2121);
    let attempts = 0;

    process.stdout.write(chalk.yellow('[INFO] Waiting for NetCon port 2121 '));
    while (attempts < 60) {
        try {
            await vconsole.connect();
            console.log(); // Перенос строки после точек
            return vconsole;
        } catch (err) {
            attempts++;
            process.stdout.write(chalk.gray('.'));
            await new Promise(res => setTimeout(res, 1000));
        }
    }
    throw new Error('VConsole connection timeout');
}

async function main() {
    console.log(chalk.cyan('--- Starting Modular Dumper ---'));

    // 1. Запуск процессов
    if (!await isProcessRunning('vconsole2.exe')) {
        launchDetached(VCONSOLE_EXE);
        await new Promise(r => setTimeout(r, 1000));
    }

    if (!await isProcessRunning('dota2.exe')) {
        launchDetached(DOTA_EXE, [
            '-dev', '-tools', '-console', '-insecure',
            '-addon', ADDON_NAME, '-netconport', '2121', '-novid'
        ]);
        // Ждем загрузку движка
        console.log(chalk.yellow('[INFO] Waiting for Dota 2 startup (8s)...'));
        await new Promise(r => setTimeout(r, 8000));
    }

    // 2. Подключение
    const client = await connectToVConsole();
    
    // 3. Подготовка папки
    // Обрати внимание: __dirname теперь указывает на папку dumper/, выходим на уровень выше
    const RAW_DATA_DIR = path.join(__dirname, '..', 'data', 'raw');
    fs.ensureDirSync(RAW_DATA_DIR);

    console.log(chalk.magenta('--- Processing Modules ---'));

    try {
        // --- ЗАПУСК МОДУЛЕЙ ПО ОЧЕРЕДИ ---
        
        // Модуль 1: Модификаторы
        await ModifiersDumper.run(client, RAW_DATA_DIR);

        // Модуль 2: (В будущем)
        // await LuaApiDumper.run(client, RAW_DATA_DIR);

        console.log(chalk.bgGreen.black('\n[SUCCESS] All modules finished!'));

    } catch (err) {
        console.error(chalk.red('\n[ERROR] Pipeline failed:'), err.message);
    } finally {
        // 4. Завершение
        client.disconnect();
        setTimeout(() => process.exit(0), 500);
    }
}

// Запуск
main();