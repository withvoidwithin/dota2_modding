# VScripts API — формат дампа

`server.json` и `client.json` — API серверной и клиентской Lua VM, снятый из
работающей игры (`-tools`, режим developer). Ключи отсортированы: `git diff`
между версиями показывает изменения API после патча.

```jsonc
{
  "build": { "clientVersion": "6942", "sourceRevision": "11055158", "versionDate": "Sep 29 2026", "steamBuildId": "25610408" },
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

Сторона — по файлу: есть в `server.json` — есть на сервере. Класс объектов,
которые создаются функциями (`CScriptUniformRandomStream`), попадает в дамп,
только если такой объект уже создавался в этой VM.

## Классы энтити — `entities.json`

Имена, которые принимают `SpawnEntityFromTableSynchronous` / `Asynchronous`,
`CEntities:CreateByClassname` и фильтры `Entities:FindAllByClassname`
(`info_target`), и C++-класс, который создаётся по каждому имени. Lua VM этого
списка не знает, он прочитан из `server.dll` той же игры, что и `server.json`.

```jsonc
{
  "build": { … },                                        // как в server.json
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
  расхождений не дала.
