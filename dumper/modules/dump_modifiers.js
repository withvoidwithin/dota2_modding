import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Путь к файлу сохранения (относительно корня проекта)
const OUTPUT_DIR = path.join(process.cwd(), 'data', 'raw');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'modifiers.txt');

/**
 * Инициализация модуля дампа модификаторов
 * @param {VConsoleClient} client - экземпляр клиента из STATE
 */
export async function init(client) {
    process.stdout.write(chalk.cyan(': '));

    // Сохраняем оригинальный обработчик, чтобы вернуть его позже
    const ORIGINAL_ONLOG = client.onLog;
    
    const collectedModifiers = [];
    const START_MARKER = '---MODIFIER_DUMP_START---';
    const END_MARKER = '---MODIFIER_DUMP_END---';

    let isRecording = false;

    // Таймер защиты (если Дота не ответит в течение 10 секунд, отменяем всё)
    const timeoutTimer = setTimeout(() => {
        client.onLog = ORIGINAL_ONLOG;
        console.log(chalk.red(' [MODULE] Error: Dump timed out!'));
    }, 10000);

    // Подменяем обработчик логов на свой
    client.onLog = (line) => {
        const cleanLine = line.trim();

        // 1. Ждем маркер начала
        if (cleanLine.includes(START_MARKER)) {
            isRecording = true;
            return;
        }

        // 2. Ждем маркер конца
        if (cleanLine.includes(END_MARKER)) {
            clearTimeout(timeoutTimer); // Удаляем таймер ошибки
            
            FinishDump(collectedModifiers, client, ORIGINAL_ONLOG);
            return;
        }

        // 3. Собираем данные, если мы в режиме записи
        if (isRecording) {
            // В дампе Доты модификаторы обычно идут строками "modifier_название"
            if (cleanLine.startsWith('modif')) {
                collectedModifiers.push(cleanLine);
            }
        }
    };

    // Отправляем команды в Доту
    // Используем небольшие задержки (setTimeout), чтобы консоль успевала переварить очередь
    client.Send(`echo ${START_MARKER}`);
    client.Send('dump_modifier_list');
    client.Send(`echo ${END_MARKER}`);
}

/**
 * Обработка собранных данных и сохранение
 */
function FinishDump(data, client, originalListener) {
    process.stdout.write(chalk.bgGreenBright.bold(' COMPLETED '));

    // Сортировка по алфавиту
    data.sort();

    try {
        // Проверяем наличие папки, если нет - создаем
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        // Записываем файл (полная перезапись)
        fs.writeFileSync(OUTPUT_FILE, data.join('\n'), 'utf8');
        
        console.log(chalk.green(` [${OUTPUT_FILE}]`));
    } catch (err) {
        console.error(chalk.red(` [File System Error: ${err.message}]`));
    }

    // Возвращаем управление главному слушателю init.js
    client.onLog = originalListener;
    
    // Опционально: сообщаем в консоль Доты, что мы закончили
    client.Print("DUMP_MODIFIERS_FINISHED");
}