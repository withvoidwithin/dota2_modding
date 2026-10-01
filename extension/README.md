# Dota 2 VScripts Annotations

Lua API definitions of Dota 2 VScripts for [EmmyLua](https://marketplace.visualstudio.com/items?itemName=tangzx.emmylua):
completion, hover documentation and checks for the functions, classes, enums and constants of the game.

The definitions are generated from the API that the game itself reports — both the server and the client
VMs — so they match the game build in the version number: `1.<game build>.<patch>`.

## What you get

- Global functions, classes with inheritance, instances (`GameRules`, `Entities`, `ParticleManager`…),
  enums and constants, core Lua helpers (`vlua`, `class`, `json`).
- Members that exist on one side only are marked `Server only.` / `Client only.` in their documentation.
- `Vector` and `QAngle` with fields, operators and method signatures.
- With the annotations connected, EmmyLua's `undefined-global` check works on Dota code.

## How it works

On start the extension writes a global EmmyLua config that adds its annotations folder to
`workspace.library` and points the `emmylua.ls.globalConfigPath` setting at it. Your project's own
`.emmyrc.json` keeps working: EmmyLua merges the libraries of both. If you already had a global config,
it is taken as the base and comes back when you disconnect.

Commands:

- **Dota 2 VScripts: Disconnect annotations** — restore your previous `emmylua.ls.globalConfigPath`.
- **Dota 2 VScripts: Connect annotations** — connect again.

## Limits

What the game does not report is not in the definitions: the class behind a `handle`, half of the
parameter names, and the callbacks an addon implements (`OnSpellStart`, `DeclareFunctions`,
`GetModifier*`).

## Data

Browse the API online and get the raw dumps: https://withvoidwithin.github.io/dota2_modding/ —
source: https://github.com/withvoidwithin/dota2_modding
