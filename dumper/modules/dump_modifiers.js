import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

// Оставлена только папка raw
const DIR_RAW = path.join(process.cwd(), 'data', 'raw');

// Путь к JSON теперь указывает в raw
const OUTPUT_JSON = path.join(DIR_RAW, 'modifiers.json');

// Инициализация модуля дампа модификаторов
export async function init(client) {
    const marker_end = '---MODIFIER_DUMP_END---';
    const marker_start = '---MODIFIER_DUMP_START---';
    const modifiers =[];
    const original_listener = client.onLog;

    let is_recording = false;

    const timeoutTimer = setTimeout(() => {
        client.onLog = original_listener;
        console.log(chalk.red('\n[MODULE] Error: Dump timed out!'));
    }, 15000);

    //[ИСПРАВЛЕНО]: Переименован аргумент logLine во избежание конфликта
    client.onLog = (logLine) => {
        const line = logLine.trim();

        if (line.includes(marker_start)){
            is_recording = true;
            return;
        }

        if (line.includes(marker_end)){
            clearTimeout(timeoutTimer);
            FinishDump(modifiers, client, original_listener);
            return;
        }

        if (is_recording){
            // Фильтр: без пробелов и не пустая строка
            if (line.length > 0 && !line.includes(' ')) {
                modifiers.push(line);
            }
        }
    };

    client.Send(`echo ${marker_start}`);
    client.Send('dump_modifier_list');
    client.Send(`echo ${marker_end}`);
}

// Обработка и сохранение данных
function FinishDump(data, client, original_listener) {
    process.stdout.write(chalk.bgGreen.black.bold(' COMPLETED '));

    data.sort();

    try {
        // Создаем только папку raw
        if (!fs.existsSync(DIR_RAW)) {
            fs.mkdirSync(DIR_RAW, { recursive: true });
        }

        // Сохранение JSON в data/raw (TXT удален)
        const jsonData = JSON.stringify(data, null, 4);
        fs.writeFileSync(OUTPUT_JSON, jsonData, 'utf8');
        
        console.log(chalk.green(`[Saved: raw/json]`));

    } catch (err) {
        console.error(chalk.red(`\n[File System Error: ${err.message}]`));
    }

    client.onLog = original_listener;
    client.Print("DUMP_MODIFIERS_FINISHED");
}