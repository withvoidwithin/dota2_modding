import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export async function run(client, outputDir) {
    const FILE_NAME = 'modifiers.txt';
    const OUTPUT_PATH = path.join(outputDir, FILE_NAME);
    
    // Буфер для хранения данных в памяти перед сортировкой
    const collectedData = [];

    console.log(chalk.yellow(`[MODULE] Starting: ${FILE_NAME}...`));

    return new Promise((resolve, reject) => {
        let isRecording = false;
        
        const MARKER_START = '--- DUMP MODIFIERS START ---';
        const MARKER_END = '--- DUMP MODIFIERS END ---';

        // Таймер защиты от зависания
        const timeoutTimer = setTimeout(() => {
            if (client.onLog) { // Если мы все еще слушаем логи
                console.log(chalk.red(`[MODULE] Timeout: ${FILE_NAME}`));
                client.onLog = null; // Отписываемся
                reject(new Error('Dump timeout'));
            }
        }, 10000);

        client.onLog = (line) => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            // 1. Старт записи
            if (cleanLine.includes(MARKER_START)) {
                isRecording = true;
                return;
            }

            // 2. Конец записи и СОРТИРОВКА
            if (cleanLine.includes(MARKER_END)) {
                isRecording = false;
                clearTimeout(timeoutTimer); // Отменяем таймер ошибки

                // Сортировка по алфавиту
                console.log(chalk.gray(`[MODULE] Sorting ${collectedData.length} entries...`));
                collectedData.sort();

                // Запись в файл (перезаписываем файл целиком)
                fs.ensureFileSync(OUTPUT_PATH);
                fs.writeFileSync(OUTPUT_PATH, collectedData.join('\n'));

                console.log(chalk.green(`[MODULE] Finished: ${FILE_NAME}`));
                
                client.onLog = null; 
                resolve(); 
                return;
            }

            // 3. Сбор данных
            if (isRecording) {
                if (cleanLine.startsWith('modifier_')) {
                    // Вместо записи на диск, кладем в массив
                    collectedData.push(cleanLine);
                }
            }
        };

        // Отправка команд
        setTimeout(() => {
            client.sendCommand(`echo "${MARKER_START}"`);
            client.sendCommand('dump_modifier_list');
            client.sendCommand(`echo "${MARKER_END}"`);
        }, 200);
    });
}