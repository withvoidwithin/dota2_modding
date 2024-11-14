# 🏗️Структура
<br>**custom_game**
<br>`|— `content
<br>`|  |— `panorama
<br>`|  |  |— `systems
<br>`|  |  |  |— `data_handler.js
<br>`|  |  |— `[addon_base.js](#Addon-Base)
<br>`|— `game
<br>`|  |— `[scripts](#scripts)
<br>`|  |  |— `[npc](#npc)
<br>`|  |  |  |— `abilities
<br>`|  |  |  |— `items
<br>`|  |  |  |— `units
<br>`|  |  |  |— `npc_abilities_custom.txt
<br>`|  |  |  |— `npc_heroes_custom.txt
<br>`|  |  |  |— `npc_items_custom.txt
<br>`|  |  |  |— `npc_units_custom.txt
<br>`|  |  |  |— `portraits.txt
<br>`|  |  |— `[vscripts](#vscripts)
<br>`|  |  |  |— `game
<br>`|  |  |  |— `gamemodes
<br>`|  |  |  |— `systems
<br>`|  |  |  |  |— `data_handler.lua
<br>`|  |  |  |  |— `players_handler.lua
<br>`|  |  |  |— `[addon_base.lua](#Addon-Base)
<br>`|  |  |  |— `addon_game_mode.lua
<br>`|  |  |  |— `addon_game_mode_client.lua
<br>`|  |  |— `custom_net_tables.txt
<br>`|  |  |— `custom.gameevents
<br>`|  |  |— `shop.txt
  
--------

# 📦Addon Base
**Addon Base** — это моя библиотека утилитарных функций, облегчающих разработку пользовательских игр Dota 2.
<br> [addon_base.js](../custom_game/content/panorama/addon_base.js) - Функции для работы с Panorama.
<br> [addon_base.lua](../custom_game/game/addon_base.lua) - Функции для работы с Lua API.

--------

# Scripts
Стандартная папка scripts используется для хранения различных скриптовых файлов и конфигурационных данных, которые влияют на поведение игры и интерфейса.

--------

# NPC
Стандартная папка npc обычно содержит файлы и скрипты, которые описывают поведение и характеристики различных игровых сущностей, таких как герои, нейтральные существа, способности и предметы.

--------

# VScripts
Стандартная папка vscripts предназначена для хранения всех скриптов, написанных на языке Lua, которые управляют логикой и механиками пользовательской игры.
