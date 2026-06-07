# Dota 2 API Dumper — Context

## Что это
Локальный инструмент для дампа API Dota 2. Состоит из Node.js дашборда и аддона для Dota 2.
Дашборд — локальный сайт, запускаемый через `npm run init` или `npm run dev` в VSCode.

## Репозиторий
```
DOTA2_MODDING/                          # Корень репозитория
├── config.js                           # Корневые константы проекта (DATA_DIR)
├── data/                               # Дампы в JSON (результат работы модулей)
│   └── modifier_list/
│       └── data.json
├── api_dumper/                         # Node.js дашборд
│   ├── dashboard/
│   │   ├── core/
│   │   │   ├── server.js               # Express сервер
│   │   │   ├── processes.js            # Проверка запущенных процессов через tasklist
│   │   │   ├── launcher.js             # Запуск dota2.exe и vconsole2.exe
│   │   │   ├── netcon.js               # TCP-клиент netcon, переподключение, SSE-события
│   │   │   ├── dump_manager.js         # Менеджер сессий дампа (маркеры, сбор строк, сохранение)
│   │   │   └── dumps/
│   │   │       └── modifier_list.js    # Модуль дампа modifier_list
│   │   ├── index.html                  # UI дашборда
│   │   ├── style.css                   # Стили
│   │   └── app.js                      # Клиентский JS (polling, SSE, обновление UI)
│   ├── .env                            # Переменные окружения
│   ├── package.json
│   └── package-lock.json
└── dota_addon/                         # Аддон Dota 2 (Lua + Panorama)
    ├── content/
    ├── game/
    └── setup_symlinks.js
```

## Как запустить
```bash
cd api_dumper
npm run init  # node dashboard/core/server.js
npm run dev   # node --watch dashboard/core/server.js
```

## Разработка
### ✅ Этап 1 — Инфраструктура дашборда
### ✅ Этап 2 — Мониторинг процессов
### ✅ Этап 3 — Netcon
### ✅ Этап 4 — Модули дампа

### Этап 5 — HTTP приёмник
Эндпоинт в server.js для приёма данных с Lua сервера аддона
Сохранение в JSON

### Этап 6 — Генерация
Модуль генерации EmmyLua аннотаций из JSON
Модуль генерации Panorama TS из JSON
Модуль генерации статического сайта

### Этап 7 — Публикация
Настройка GitHub Pages
Кнопка коммита и пуша

## Важные детали
- Для работы netcon нужны оба процессы: Dota 2 И VConsole
- Кнопки модулей дампа блокируются если netcon офлайн
- Сбор данных двумя способами: через netcon (TCP) и через HTTP с Lua аддона
- Дампы сохраняются в DOTA2_MODDING/data/<module_name>/data.json

## Соглашения по коду
- Стили только в style.css
- Клиентский JS только в app.js
- Серверная логика разбита по модулям: processes.js, launcher.js, netcon.js и т.д.
- Модули дампа — отдельные файлы в dashboard/core/dumps/
- Все машинно-специфичные настройки только через .env
- config.js в корне — source of truth для структурных констант (DATA_DIR), общих между модулями
- После выполненного этапа актуализировать context.md

## Правила разработки
- Если не хватает данных — спросить, не придумывать
- Каждый модуль — отдельный файл, не писать всё в server.js

## Важные решения
- server.js лежит в dashboard/core/, а не в корне api_dumper/
- Кнопка запуска запускает оба процесса сразу (Dota + VConsole)
- Защита от двойного запуска на уровне сервера (checkProcesses перед launch)
- Polling каждую секунду для статусов процессов; SSE для netcon-логов и dump-событий
- Netcon авто-коннектится при старте сервера, не ждёт команды от клиента; переподключение каждые 2 сек
- SSE-поток /api/netcon/stream транслирует события и netcon, и dumpManager в одном канале
- SSE и polling инициализируются в init() после загрузки /api/config — защита от race condition
- Маркеры дампа: echo с тегом до и после команды — `@API_DUMPER:DASHBOARD DUMP_START:<module>`
- Одновременно может выполняться только один дамп (блокировка через session в dump_manager)
- Роуты дампа регистрируются вручную в server.js — при добавлении модуля нужен новый POST /api/dump/<name>
- ID кнопок дампа: `btn-dump-{name.replace(/_/g, "-")}` — используется в app.js для dump_start/dump_end
- dump_manager.js берёт DATA_DIR из корневого config.js
- Функция обработки строк в модулях дампа экспортируется под ключом `process`
- Цветовая маркировка логов: @API_DUMPER → #9881FF, :LUA → #98C8FF, :DASHBOARD → #FFE9A2
- Конфиг для клиента через /api/config — env-переменные не хардкодятся в app.js