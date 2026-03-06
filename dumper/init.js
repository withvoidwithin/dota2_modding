// Import Modules
// --------------------------------------------------------------------------------------------------------------------------------
import { spawn, exec } from 'child_process';        // Позволяет запускать другие программы и выполнять команды терминала.
import { VConsoleClient } from './vconsole.js';     // Модуль работы с консолью.
import dotenv from 'dotenv';                        // Загружаем настройки из файла .env
import fs from 'fs';                                // Модуль для проверки существования файлов
import path from 'path';                            // Нужен для правильного составления путей OC.
import chalk from 'chalk';

// Dump Modules
import * as DumpModifiers from './modules/dump_modifiers.js';

// Import .env
dotenv.config();

// Constants
// --------------------------------------------------------------------------------------------------------------------------------

// Env
const DOTA_ADDON_MAP_NAME = process.env.DOTA_ADDON_MAP_NAME
const DOTA_ADDON_NAME = process.env.DOTA_ADDON_NAME
const DOTA_NETCON_PORT = process.env.DOTA_NETCON_PORT
const DOTA_PATH = process.env.DOTA_PATH
const DUMPER_TAG = process.env.DUMPER_TAG
const VCONSOLE_TAG = process.env.VCONSOLE_TAG

// Paths
const PATH_DOTA_EXE = path.join(DOTA_PATH, 'game', 'bin', 'win64', 'dota2.exe')
const PATH_VCONSOLE_EXE = path.join(DOTA_PATH, 'game', 'bin', 'win64', 'vconsole2.exe')

// Tables
const STATE = {
    vconsole: null,
}

const VCONSOLE_LISTENER_COMMANDS = {
    ["DUMP_MODIFIERS"]: DumpModifiers.init,
}

const DOTA_EXE_ARGS = [
    '-dev',                             // Режим разработчика
    '-tools',                           // Инструменты моддинга
    '-insecure',                        // Отключение VAC
    '-console',                         // Включить консоль
    '-novid',                           // Без заставки Valve
    '-netconport', DOTA_NETCON_PORT,    // Открыть NETCON порт
    
    // Сразу загружаем аддон
    '-addon', DOTA_ADDON_NAME,
]

// Main
// --------------------------------------------------------------------------------------------------------------------------------

function IsProcessRunning(processName){
    // Проверяет, запущен ли процесс по его имени (например, 'dota2.exe').
    // Возвращает Promise, который разрешается в true или false.
    return new Promise((resolve) => {
        // Выполняем команду Windows 'tasklist', фильтруем по имени образа
        exec(`tasklist /FI "IMAGENAME eq ${processName}"`, (err, stdout) => {
            if (err) {
                // Если ошибка выполнения команды, считаем что не запущен
                resolve(false);
                return;
            }

            // Если в выводе команды есть имя процесса, значит он работает
            resolve(stdout.toLowerCase().includes(processName.toLowerCase()));
        });
    });
}

function LaunchProcess(executablePath, args = []) {
    // Запускает программу отдельно от этого скрипта (detached).
    // Это значит, что если этот скрипт закроется, игра продолжит работать.

    const subprocess = spawn(executablePath, args, {
        detached: true,   // Отвязать процесс
        stdio: 'ignore'   // Игнорировать вывод (не засорять нашу консоль)
    });

    subprocess.unref(); // Разрешить Node.js завершиться, не ожидая закрытия игры
}

function LaunchAddon(){
    const command_launch_addon = `dota_launch_custom_game ${DOTA_ADDON_NAME} ${DOTA_ADDON_MAP_NAME}`;

    STATE.vconsole.Send(command_launch_addon);
}

function InitVConsoleListener(){
    if (!STATE.vconsole) return console.error(chalk.red('[ERROR] VConsole client not found in STATE!')) 

    STATE.vconsole.onLog = (log_line) => {
        const cleanLine = log_line.trim();
        if (!cleanLine) return;

        // Определяем наш префикс
        const TAG = `${VCONSOLE_TAG}.`;

        // Проверяем, содержит ли строка нашу команду
        if (cleanLine.includes(TAG)) {
            // 1. Находим, где начинается тег
            const startIndex = cleanLine.indexOf(TAG);
            
            // 2. Отрезаем всё лишнее слева (время, [VScript] и т.д.)
            const content = cleanLine.substring(startIndex + TAG.length);
            
            // 3. Берем первое слово — это и есть название команды
            const commandName = content.split(' ')[0].trim();

            // --- ВЫПОЛНЕНИЕ ---
            const action = VCONSOLE_LISTENER_COMMANDS[commandName];

            if (action && typeof action === 'function') {
                process.stdout.write(chalk.cyan(` ○ Executing module: ${commandName}`)); 

                action(STATE.vconsole);
            } else {
                console.warn(chalk.yellow(`[WARN] Handler not found for command: ${commandName}`));
            }
        }
    };

    console.log(chalk.green(' ○ VConsole listener attached!'));
}

// Main Async
// --------------------------------------------------------------------------------------------------------------------------------

async function CheckProcessVConsole(){
    const process = await IsProcessRunning('vconsole2.exe');

    if(process){
        console.log(chalk.green.bold(' ○ VConsole detected! '));
    } else {
        console.log(chalk.cyan.bold(' ○ VConsole starting... '));
        LaunchProcess(PATH_VCONSOLE_EXE)
    }
}

async function CheckProcessDota(){
    const process = await IsProcessRunning('dota2.exe');

    if(process){
        console.log(chalk.green.bold(' ○ Dota detected! '));
    } else {
        console.log(chalk.cyan.bold(' ○ Dota starting... '));
        LaunchProcess(PATH_DOTA_EXE, DOTA_EXE_ARGS);
    }
}

async function InitVConsole(){
    process.stdout.write(chalk.cyan(' ○ VConsole connection init'));

    // Бесконечный цикл
    while (true) {
        const client = new VConsoleClient(2121);

        try {
            await client.Connect();

            STATE.vconsole = client

            console.log(chalk.green(' ○ VConsole connection successful!'))

            return client;

        } catch (err) {
            // Если ошибка:
            // 1. Принудительно убиваем сокет, чтобы не висел в памяти
            // (обращаемся напрямую к net.Socket, т.к. твой метод disconnect проверяет флаг connected)
            client.client.destroy(); 
            
            // 2. Рисуем точку и ждем
            process.stdout.write(chalk.gray('.')); 
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

// Init
// --------------------------------------------------------------------------------------------------------------------------------

async function Init(){
    console.log(chalk.bgMagentaBright.bold(' ======== API DUMPER INIT ======== '));

    await CheckProcessVConsole()
    await CheckProcessDota()
    await InitVConsole()

    InitVConsoleListener()
    LaunchAddon()
}

Init()