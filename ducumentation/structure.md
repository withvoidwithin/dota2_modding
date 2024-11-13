# Базовая структура
Основная структура пользовательской игр делится на две ключевые папки **Сontent** и **Game**.
- **Content** - содержит в себе исходные файлы всех игровых ассетов, интерфейсов и данных в оригинальных форматах. *(.vmap, .vmat, .vpcf, .png, .fbx и другие.)*
- **Game** - хранит закомпилированные файлы из папки content и прочие файлы не требующие компиляции, например lua скрипты и kv таблицы. Именно файлы из game используются движком игры в игровом процессе.

--------

# Структура файлов проекта
- custom_game/
  - [assets](structure/assets.md#assets)
  - [maps](#maps)
  - [panorama](#panorama)
  - resource
  - scripts
  - soundevents
  - addoninfo.txt
  - panorama_debugger.cfg
  - tools_asset_info.bin
  - tools_thumbnail_cache.bin

--------

# Maps
Стандартная папка maps в структуре ассетов предназначена для хранения всех файлов, связанных с игровыми картами и префабами.

# Panorama
Стандартная папка panorama хранит в себе макеты (layouts .xml), стили (styles .css) и скрипты (scripts, .js).
