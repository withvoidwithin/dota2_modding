// Импорт модулей
// --------------------------------------------------------------------------------------------------------------------------------
import { spawn, exec } from 'child_process';        // Позволяет запускать другие программы и выполнять команды терминала.
import { VConsoleClient } from './vconsole.js';     // Модуль работы с консолью.
import dotenv from 'dotenv';                        // Загружаем настройки из файла .env
import fs from 'fs';                                // Модуль для проверки существования файлов
import path from 'path';                            // Нужен для правильного составления путей OC.
import chalk from 'chalk';

// Загружаем переменные из .env
dotenv.config();

// КОНСТАНТЫ И НАСТРОЙКИ
// --------------------------------------------------------------------------------------------------------------------------------
const VCONSOLE_TAG = "@API_DUMPER"
const ADDON_NAME = 'api_dumper_mod'
const MAP_NAME = 'dump'
const DOTA_ARGS = [
    '-dev',                 // Режим разработчика
    '-tools',               // Инструменты моддинга
    '-insecure',            // Отключение VAC
    '-console',             // Включить консоль
    '-novid',               // Без заставки Valve
    '-netconport', '2121',  // Открыть NETCON порт
    
    // Сразу загружаем аддон
    '-addon', ADDON_NAME,
]

const STATE = {
    vconsole: null,
}


const PATH_WORK = process.env.DOTA_PATH;
const EXE_DOTA = path.join(PATH_WORK, 'game', 'bin', 'win64', 'dota2.exe');
const EXE_VCONSOLE = path.join(PATH_WORK, 'game', 'bin', 'win64', 'vconsole2.exe');

// Базовые функции
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

function VConsolePrint(message){
    STATE.vconsole.sendCommand(`echo ${VCONSOLE_TAG} ${message}`);
}

function VConsoleInitCommand(command){
    STATE.vconsole.sendCommand(command);
}

function LaunchAddon(){
    const command_launch_addon = `dota_launch_custom_game ${ADDON_NAME} ${MAP_NAME}`;

    VConsoleInitCommand(command_launch_addon);
}

function InitVConsoleListener(){
    STATE.vconsole.onLog = (line) => {
        const cleanLine = line.trim();

        // Игнорируем пустые строки
        if (!cleanLine) return;
        
        // Пример 1: Дота подтвердила нашу команду
        if (cleanLine.includes('@API_DUMPER.DUMP.MODIFIERS')) {
            console.log(chalk.magentaBright('[EVENT] Dumper Initialized!'));
        }
    }
}

// Базовые функции асинхронные
// --------------------------------------------------------------------------------------------------------------------------------

async function CheckProcessVConsole(){
    const process = await IsProcessRunning('vconsole2.exe');

    if(process){
        console.log(chalk.green.bold(' ○ VConsole detected! '));
    } else {
        console.log(chalk.cyan.bold(' ○ VConsole starting... '));
        LaunchProcess(EXE_VCONSOLE)
    }
}

async function CheckProcessDota(){
    const process = await IsProcessRunning('dota2.exe');

    if(process){
        console.log(chalk.green.bold(' ○ Dota detected! '));
    } else {
        console.log(chalk.cyan.bold(' ○ Dota starting... '));
        LaunchProcess(EXE_DOTA, DOTA_ARGS);
    }
}

async function InitVConsole(){
    process.stdout.write(chalk.cyan(' ○ Init VConsole connection '));

    // Бесконечный цикл
    while (true) {
        const client = new VConsoleClient(2121);

        try {
            await client.connect();

            STATE.vconsole = client

            console.log(chalk.green(' ○ VConsole Connection successful!'))

            VConsolePrint("Init")

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

// Инициализация
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