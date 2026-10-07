// Changelog of the VScripts API between game builds. No DOM and no imports: tools/dota-api/generate.mjs computes
// it from two models (diffModels) and writes data/vscripts/changelog.json; the site reads that file and finds the
// changes of a page by route (changeIndex, latestMarks). Both sides share what an "item" is: whatever has a page,
// a member or a row on the site, under the same route.

/** Kinds of items in the order a record of changes lists them. */
export const CHANGE_KINDS = ["class", "method", "type", "function", "instance", "enum", "enum value", "Lua", "table", "constant", "entity"];

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * What of a function is compared: its signature, and the description of the engine when it has one. A signature keeps
 * the shape the site draws it from: { params, returns } of a function the engine describes, { params, vararg } or
 * { native } of a Lua one, { params, result } of a probed method of a value type.
 */
function functionFacets(fn) {
  if (fn.returns !== undefined) return { signature: { params: fn.params, returns: fn.returns }, desc: fn.desc };
  return { signature: fn.native ? { native: true } : { params: fn.params, vararg: fn.vararg || undefined } };
}

/**
 * Every item of a model by route: { route, kind, label, sides, facets, parent }. `facets` is what a change of the
 * item is made of; `parent` is the route of the item it is a member of. Only `sides` are considered, and an item
 * with none of them is left out: two dumps are compared on what both have. Booleans of `_G` are not items: they are
 * the debug flags of the VM (ScriptDebugTraceAllOn), its state at the moment of the dump, not API.
 * Compared are what the site shows of each kind; the values the dump probes (fields and operators of value types),
 * where a Lua function is defined and the class of an instance are not.
 */
export function describeModel(model, sides = model.sides, { entities = true } = {}) {
  const items = new Map();
  const add = (route, kind, label, own, facets = {}, parent = null) => {
    const shared = [...own].filter((side) => sides.includes(side)).sort();
    if (shared.length) items.set(route, { route, kind, label, sides: shared, facets, parent });
  };
  const addFunction = (route, kind, label, own, fn, parent) => add(route, kind, label, own, functionFacets(fn), parent);

  for (const cls of model.classes.values()) {
    const route = `class/${cls.name}`;
    add(route, "class", cls.name, cls.sides, { base: cls.baseOn });
    for (const member of cls.members.values()) {
      addFunction(`${route}/${member.name}`, "method", `${cls.name}:${member.name}`, member.sides, member.fn, route);
    }
  }
  for (const type of model.valueTypes.values()) {
    const route = `type/${type.name}`;
    add(route, "type", type.name, type.sides);
    for (const member of model.typeMethods(type)) {
      const probed = type.value.probe?.methods?.[member] ?? null;
      add(`${route}/${member}`, "method", `${type.name}:${member}`, type.sides, { signature: probed }, route);
    }
  }
  for (const fn of model.functions.values()) addFunction(`function/${fn.name}`, "function", fn.name, fn.sides, fn.value);
  // The class of an instance is not compared: `c`, a stray global of the VM, held a CEntityInstance in one dump and a
  // CBaseEntity in the next (an entity left in a variable, not API — an assumption).
  for (const instance of model.instances.values()) add(`instances/${instance.name}`, "instance", instance.name, instance.sides);
  for (const enumeration of model.enums.values()) {
    const route = `enum/${enumeration.name}`;
    add(route, "enum", enumeration.name, enumeration.sides);
    for (const [name, info] of Object.entries(enumeration.value)) {
      add(`${route}/${name}`, "enum value", name, enumeration.sides, { value: info.value, desc: info.desc }, route);
    }
  }
  for (const global of model.lua.values()) {
    const route = `global/${global.name}`;
    if (global.value.type === "function") {
      addFunction(route, "Lua", global.name, global.sides, global.value.fn);
      continue;
    }
    add(route, "table", global.name, global.sides);
    for (const [name, info] of Object.entries(global.value.members ?? {})) {
      if (info.type === "function") addFunction(`${route}/${name}`, "Lua", `${global.name}.${name}`, global.sides, info.fn, route);
    }
  }
  for (const constant of model.constants.values()) {
    if (typeof constant.value.value !== "boolean") add(`constants/${constant.name}`, "constant", constant.name, constant.sides, { value: constant.value.value });
  }
  if (entities) {
    for (const entity of model.entities.values()) add(`entities/${entity.name}`, "entity", entity.name, ["server"], { cls: entity.cls });
  }
  return items;
}

/**
 * Changes from the `prev` model to the `next` one, in the order of CHANGE_KINDS, then by name:
 * { op: "added" | "removed" | "changed", kind, label, route, sides, members?, was?, now? }.
 * `members` counts what a new or a removed item brings along (the methods of a new class), which are not listed
 * themselves. `was` and `now` hold the facets that differ: sides, signature, desc, value, base, cls.
 * Only the sides both models have are compared; entity classes only when both models have them.
 */
export function diffModels(prev, next) {
  const sides = next.sides.filter((side) => prev.sides.includes(side));
  const entities = prev.entities.size > 0 && next.entities.size > 0;
  const before = describeModel(prev, sides, { entities });
  const after = describeModel(next, sides, { entities });
  const changes = [];
  const listed = new Map();
  const record = (op, item, extra) => {
    const change = { op, kind: item.kind, label: item.label, route: item.route, sides: item.sides, ...extra };
    listed.set(item.route, change);
    changes.push(change);
  };

  const under = new Map();   // route of an added or removed item → how many of its members came or went with it
  for (const [from, to, op] of [[before, after, "added"], [after, before, "removed"]]) {
    for (const item of to.values()) {
      if (from.has(item.route)) continue;
      if (item.parent && !from.has(item.parent)) under.set(item.parent, (under.get(item.parent) ?? 0) + 1);
      else record(op, item);
    }
  }
  for (const [route, members] of under) listed.get(route).members = members;

  for (const item of after.values()) {
    const old = before.get(item.route);
    if (!old) continue;
    const was = {};
    const now = {};
    if (!same(old.sides, item.sides)) {
      was.sides = old.sides;
      now.sides = item.sides;
    }
    for (const key of new Set([...Object.keys(old.facets), ...Object.keys(item.facets)])) {
      if (same(old.facets[key], item.facets[key])) continue;
      was[key] = old.facets[key] ?? null;
      now[key] = item.facets[key] ?? null;
    }
    if (Object.keys(was).length) record("changed", item, { was, now });
  }
  return changes.sort((a, b) => CHANGE_KINDS.indexOf(a.kind) - CHANGE_KINDS.indexOf(b.kind) || compare(a.label, b.label) || compare(a.op, b.op));
}

/** Id of a build in links and anchors: the Steam build id, for a dump made before they were recorded the game version. */
export const buildId = (build) => build.steamBuildId ?? build.clientVersion;

/** Counts of the changes of an entry by operation. */
export function countChanges(changes) {
  const counts = { added: 0, removed: 0, changed: 0 };
  for (const change of changes) counts[change.op]++;
  return counts;
}

// Every entry is a file of its own, and an index lists them. The index is cheap to load; an entry is fetched when
// something needs its changes: the page of the changelog for the entry it opens, a History block for the entries that
// touch its page, the marks for the newest one.

/** The page an item is on: the first two parts of its route (`class/CBaseEntity/GetOrigin` → `class/CBaseEntity`). */
export const pageOf = (route) => route.split("/").slice(0, 2).join("/");

/** Kinds of page that have a History block. */
const HISTORY_PAGES = new Set(["class", "type", "enum", "global"]);

/**
 * An entry as the index lists it: all of it but the changes, plus their counts and the `pages` with a History block
 * that they touch, so that a page fetches only the entries it is in.
 */
export function summarizeEntry({ build, from, notes, changes }) {
  const pages = new Set(changes.map((change) => pageOf(change.route)).filter((page) => HISTORY_PAGES.has(page.split("/")[0])));
  return { build, from, ...(notes && { notes }), counts: countChanges(changes), pages: [...pages].sort() };
}

/** Folder of the entry files: named like the index, next to it (`vscripts/changelog.json` → `vscripts/changelog`). */
export const entryDir = (indexPath) => indexPath.replace(/\.json$/, "");

/** File of an entry: `vscripts/changelog/<build id>.json`. */
export const entryPath = (indexPath, build) => `${entryDir(indexPath)}/${buildId(build)}.json`;

/**
 * What the newest entry says about each route that still exists: route → { mark: "new" | "updated", entry, change,
 * derived }. A member that came, went or changed makes its page (class, enum, value type, table) "updated" when the
 * page has no change of its own; `derived` says so. Members of a new item are not marked: the item is.
 */
export function latestMarks(entries) {
  const marks = new Map();
  const [entry] = entries;
  if (!entry) return marks;
  for (const change of entry.changes) {
    if (change.op !== "removed") marks.set(change.route, { mark: change.op === "added" ? "new" : "updated", entry, change, derived: false });
  }
  for (const change of entry.changes) {
    const [kind, name, member] = change.route.split("/");
    const parent = `${kind}/${name}`;
    if (member !== undefined && !marks.has(parent)) marks.set(parent, { mark: "updated", entry, change, derived: true });
  }
  return marks;
}
