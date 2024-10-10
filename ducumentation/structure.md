# Базовая структура
Основная структура пользовательской игр делится на две ключевые папки **Сontent** и **Game**.
- **Content** - содержит в себе исходные файлы всех игровых ассетов, интерфейсов и данных в оригинальных форматах. *(.vmap, .vmat, .vpcf, .png, .fbx и другие.)*
- **Game** - хранит закомпилированные файлы из папки content и прочие файлы не требующие компиляции, например lua скрипты и kv таблицы. Именно файлы из game используются движком игры в игровом процессе.

# Структура файлов проекта
- custom_game/
  - [assets](#assets)
    - [materials](#materials)
    - models
    - particles
    - sounds
    - textures
    - ui
  - maps
  - panorama
  - resource
  - scripts
  - soundevents
  - addoninfo.txt
  - panorama_debugger.cfg
  - tools_asset_info.bin
  - tools_thumbnail_cache.bin

## Assets
Определенные игровые ассеты не обязательно хранить в предложенной по умолчанию структуре файлов. Их можно положить куда угодно и движок без проблем сможет их использовать если указать корректный путь. <br>
В моей концепции игровые ресурсы находятся в папке assets и организованы несколько иначе, чем обычно.

## Materials
Папка materials это место хранения всех материалов. Внутрении папки имеют следующую структуру:

### Blends
Мультибленд материалы для дизайна локации в Hammer Editor.<br>
  `.../materials/blends/magic_forest/terrain_nature.vmat` <br>
  `.../materials/blends/magic_forest/terrain_nature_nav.vmat` <br>

#### Определение суфиксов:
- без суфикса - простой материал.
- nav - создает навигационную сетку.
- edge - блокирует навигационную сетку.
- edge_fow - блокирует навигационную сетку и создает туман войны.

### Environment
Материалы окружения, используемые для создания дизайна карт в редакторе Hammer.
  `.../materials/environment/magic_forest/grass.vmat` <br>
  `.../materials/environment/magic_forest/grass_nav.vmat` <br>

### Generic
Специальные материалы, которые широко применяются в различных областях, например, в различных моделях.
  `.../materials/generic/buildings/buildings.vmat` <br>

### Structures
Материалы предназначеные для конкретных моделей. <br>
  `.../materials/structures/ruin_block/ruin_block.vmat`
