# Структура архитектуры
- content
  - panorama
    - systems
      - data_handler.js
    - [addon_base.js](#Addon-Base)
- game
  - [scripts](#scripts)
    - [npc](#npc)
      - abilities
      - items
      - units
      - npc_abilities_custom.txt
      - npc_heroes_custom.txt
      - npc_items_custom.txt
      - npc_units_custom.txt
      - portraits.txt
    - [vscripts](#vscripts)
      - game
      - gamemodes
      - systems
        - data_handler.lua
      - [addon_base.lua](#Addon-Base)
      - addon_game_mode.lua
      - addon_game_mode_client.lua
    - custom.gameevents
    - custom_net_tables.txt

# Подробная документация
## Scripts
Стандартная папка scripts используется для хранения различных скриптовых файлов и конфигурационных данных, которые влияют на поведение игры и интерфейса.

## NPC
Стандартная папка npc обычно содержит файлы и скрипты, которые описывают поведение и характеристики различных игровых сущностей, таких как герои, нейтральные существа, способности и предметы.

## VScripts
Стандартная папка vscripts предназначена для хранения всех скриптов, написанных на языке Lua, которые управляют логикой и механиками пользовательской игры.

## Addon Base
**Addon Base** — это моя библиотека утилитарных функций, облегчающих разработку пользовательских игр Dota 2.
<br> [addon_base.js](../custom_game/content/panorama/addon_base.js) - Функции для работы с Panorama.
<br> [addon_base.lua](../custom_game/game/addon_base.lua) - Функции для работы с Lua API.
