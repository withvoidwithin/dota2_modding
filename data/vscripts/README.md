# VScripts API — формат дампа

`server.json` и `client.json` — API серверной и клиентской Lua VM, снятый из
работающей игры (`-tools`, режим developer). Ключи отсортированы: `git diff`
между версиями показывает изменения API после патча.

```jsonc
{
  "build": { "clientVersion": "6942", "sourceRevision": "11055158", "versionDate": "Sep 29 2026", "steamBuildId": "25610408" },
  "map": "dota",
  "api": {
    "functions":  { "<имя>": Function },           // глобальные функции движка
    "classes":    { "<имя>": Class },
    "instances":  { "<имя глобального>": "<класс>" },   // GameRules → CDOTAGameRules
    "enums":      { "<перечисление>": { "<значение>": { "value": 0, "desc": "" } } },
    "globals":    { "<имя>": Global },             // прочее из _G
    "valueTypes": { "<имя>": ValueType }            // Vector, QAngle, UInt64
  }
}
```

- `build` — сборка игры, из которой снят дамп: `clientVersion`, `sourceRevision`,
  `versionDate` — из `game/dota/steam.inf`; `steamBuildId` — Steam build id
  установленной игры. По нему сайт сверяет дамп с текущей сборкой в Steam.
- `map` — карта, на которой снят дамп (`GetMapName()`). Содержимое VM зависит от
  условий дампа, поэтому чейнджлог предупреждает, если карты двух дампов
  разные. У дампов до появления поля его нет — для чейнджлога «unknown».
- `Function` — `{ "desc", "returns", "params": [{ "name", "type" }] }`. Типы —
  как их называет движок: `int`, `float`, `bool`, `string`, `handle`,
  `Vector`, `<unknown>` и т. д. Пустое `name` — движок имя не сообщает.
- `Class` — `{ "base"?, "methods": { "<имя>": Function }, "extra": { "<имя>": LuaFunction } }`.
  `extra` — методы без описания движка (Lua-обёртки ядра, `IsNull`).
- `LuaFunction` — `{ "native": true }` для функции на C или
  `{ "params": [...], "vararg"?, "source", "lines": [начало, конец] }` для
  Lua-функции ядра.
- `Global` — `{ "type": "function", "fn": LuaFunction }`,
  `{ "type": "table", "members": { "<имя>": { "type", "fn"? } } }` или
  `{ "type": "number" | "string" | "boolean", "value" }`.
- `ValueType` — `{ "members": { "<имя>": "<тип Lua>" }, "probe"? }`. `probe` —
  что показала проба образца, созданного конструктором без аргументов:
  `fields`, `operators` (`op`, `left`, `right`, `result`), `methods`
  (`params` — какие аргументы сработали, `result`).

Сторона — по файлу: есть в `server.json` — есть на сервере. Классы объектов,
которые создаются функциями (`CScriptUniformRandomStream`, `CTakeDamageInfo`,
`CScriptHTTPRequest`), VM регистрирует при первом таком объекте; дампер создаёт
по одному перед снятием, поэтому они в дампах с сборки 6951. Классы в дампах до
неё есть или нет случайно: чейнджлог записал их появление как добавление.

## Классы энтити — `entities.json`

Имена, которые принимают `SpawnEntityFromTableSynchronous` / `Asynchronous`,
`CEntities:CreateByClassname` и фильтры `Entities:FindAllByClassname`
(`info_target`), и C++-класс, который создаётся по каждому имени. Lua VM этого
списка не знает, он прочитан из `server.dll` той же игры, что и `server.json`.

```jsonc
{
  "build": { … },                                        // как в server.json
  "parser": 2,                                           // версия разбора server.dll (PARSER_REVISION в entities.mjs); нет поля — 1
  "entities": { "<имя>": "<C++-класс>" },                // info_target → CInfoTarget
  "classes":  { "<C++-класс>": "<его основная база>" }   // CInfoTarget → CPointEntity, из RTTI
}
```

- `classes` — цепочка наследования C++ до корня для каждого класса из
  `entities`. По ней сайт находит Lua-класс энтити — ближайший класс цепочки,
  который описан в API (`npc_dota_hero_axe`: `CDOTA_Unit_Hero_Axe` →
  `CDOTA_BaseNPC_Hero`), и вид: предмет, способность, герой, юнит, прочее.
- Способности и предметы — тоже энтити, поэтому они в списке.
- Алиас — второе имя класса: C++-класс вида `<Класс>Alias_<имя>`
  (`dynamic_prop` → `CDynamicPropAlias_dynamic_prop`).
- Полнота не доказана: записи ищутся по форме кода. Выборочная сверка с
  подсказками консольной команды `ent_create` (все имена на `info_`)
  расхождений не дала. Форма кода меняется с патчем: в сборке 6951 разбор версии 1
  потерял 273 имени, в том числе всех героев, и версия 2 вернула их. Чейнджлог
  между сборками, разобранными разными версиями, предупреждает.

## Чейнджлог — `changelog.json`

Что изменилось в API между сборками игры, дамп которых есть в истории git.
Каждая запись — отдельный файл `changelog/<id сборки>.json`; `changelog.json` —
индекс записей. Сайт грузит индекс и последнюю запись (для меток), остальные —
когда их открывают или когда страница, которой они касаются, показывает History.
Файлы не правятся и не дополняются вручную: генератор каждый раз собирает их
заново из истории `server.json` и `client.json` (снимок — дампы одного коммита
или файлы на диске как самый новый; снимки с одной версией игры — `ClientVersion`
и `SourceRevision` — это одна сборка, берётся самый новый). Две соседние сборки
сравнивает та же модель, по которой сайт показывает API (`site/assets/model.js`,
`site/assets/changelog.js`), поэтому изменение — это то, что на сайте выглядит
иначе.

Индекс — `changelog.json`:

```jsonc
{
  "first":   Build,                    // самая старая сборка, с которой начинается история
  "entries": [                         // от новой к старой
    {
      "build": Build, "from": Build,   // сравниваются дампы сборок `from` и `build`
      "notes"?: ["…"],                 // условия дампов разные: часть изменений может быть от дампа, не от игры
      "counts": { "added": 0, "removed": 0, "changed": 0 },
      "pages": ["class/CBaseEntity"]   // страницы с блоком History (class, type, enum, global), которых касаются изменения
    }
  ]
}
```

Запись — `changelog/<id сборки>.json`, id — `steamBuildId` (у дампа до его
появления — `clientVersion`):

```jsonc
{ "build": Build, "from": Build, "notes"?: ["…"], "changes": [ Change ] }   // build, from и notes — как в индексе
```

- `Build` — `{ clientVersion, sourceRevision, steamBuildId?, versionDate }`, как
  `build` дампа. Id сборки на сайте — `steamBuildId`, а у дампа до его появления
  — `clientVersion`.
- `Change` — `{ op, kind, label, route, sides, members?, was?, now? }`. `op` —
  `added`, `removed` или `changed`; `kind` — class, method, type, function,
  instance, enum, enum value, Lua, table, constant, entity; `route` — адрес
  страницы на сайте (`class/CBaseEntity/GetAbsOrigin`); `sides` — стороны
  элемента (у `removed` — какие были). У нового или удалённого элемента
  `members` — сколько его членов пришло или ушло вместе с ним (методов
  нового класса): сами они не перечисляются. У `changed` в `was` и `now` — только
  то, что отличается: `sides`, `signature`, `desc`, `value`, `base`, `cls`.
- Сравниваются стороны, которые есть в обоих дампах, и классы энтити — только
  если они есть в обоих снимках и снимок одной версии игры с дампами. Не
  сравниваются: булевы глобалы (флаги отладки VM, `ScriptDebug*`), поля и
  операторы типов значений, место определения Lua-функций, класс глобального
  экземпляра (у `c` он менялся между дампами: CEntityInstance → CBaseEntity —
  предположение, что это оставленная в переменной энтити, а не API), значения,
  которые у одного имени различаются по сторонам (сайт показывает значение
  первой стороны).
- Сборка, которую не снимали, записи не имеет: её изменения попадают в запись
  следующей снятой. Точность «когда изменилось» равна частоте дампов.
