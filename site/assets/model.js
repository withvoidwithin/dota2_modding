// VScripts API model: the server and client dumps merged, every declaration knows the sides it exists on.
// No DOM here: the page code in app.js renders what this module describes.

/** At most this many search hits are kept. */
export const SEARCH_LIMIT = 300;

// One matching rule for every search and filter of the site: the query is split into words, a name matches
// when it contains every word, in any order. "dota max" finds DOTA_ITEM_MAX; "spawn table" finds
// SpawnEntityFromTableAsynchronous.

/** Words of a query, lower case; none for an empty query. */
export const queryWords = (query) => query.trim().toLowerCase().split(/\s+/).filter(Boolean);
/** Whether a lower-case text contains every word; any text matches no words. */
export const matchesWords = (text, words) => words.every((word) => text.includes(word));

export class VscriptsModel {
  constructor(dataset, dumps) {
    this.id = dataset.id;
    this.dataset = dataset;
    this.sides = Object.keys(dumps);
    this.builds = Object.fromEntries(this.sides.map((side) => [side, dumps[side].build]));
    const merge = (pick) => {
      const result = new Map();
      for (const side of this.sides) {
        for (const [name, value] of Object.entries(pick(dumps[side].api) ?? {})) {
          if (!result.has(name)) result.set(name, { name, value, sides: new Set() });
          result.get(name).sides.add(side);
        }
      }
      return result;
    };

    this.functions = merge((api) => api.functions);
    this.instances = merge((api) => api.instances);
    this.enums = merge((api) => api.enums);
    this.valueTypes = merge((api) => api.valueTypes);

    this.classes = new Map();
    for (const side of this.sides) {
      for (const [name, cls] of Object.entries(dumps[side].api.classes ?? {})) {
        if (!this.classes.has(name)) {
          this.classes.set(name, { name, sides: new Set(), bases: new Set(), baseOn: {}, members: new Map() });
        }
        const model = this.classes.get(name);
        model.sides.add(side);
        if (cls.base) {
          model.bases.add(cls.base);
          model.baseOn[side] = cls.base;
        }
        for (const [kind, source] of [["bound", cls.methods], ["plain", cls.extra]]) {
          for (const [member, fn] of Object.entries(source ?? {})) {
            if (!model.members.has(member)) model.members.set(member, { name: member, kind, fn, sides: new Set() });
            model.members.get(member).sides.add(side);
          }
        }
      }
    }
    for (const model of this.classes.values()) {
      model.derived = [...this.classes.values()].filter((other) => other.bases.has(model.name)).map((other) => other.name).sort();
      model.instances = [...this.instances.values()].filter((instance) => instance.value === model.name).map((instance) => instance.name);
    }

    // Other globals. A Lua function defined inside the body of another one exists only because that
    // function ran (helpers of ScriptFunctionHelp and the like): a side effect, not API.
    const globals = merge((api) => api.globals);
    const luaFunctions = [...globals.values()].filter((global) => global.value.type === "function" && global.value.fn.lines);
    const nested = new Set(luaFunctions.filter((inner) => luaFunctions.some((outer) =>
      outer !== inner && outer.value.fn.source === inner.value.fn.source &&
      outer.value.fn.lines[0] < inner.value.fn.lines[0] && inner.value.fn.lines[1] <= outer.value.fn.lines[1])).map((global) => global.name));
    this.lua = new Map();
    this.constants = new Map();
    for (const global of globals.values()) {
      if (nested.has(global.name) || this.valueTypes.has(global.name)) continue;
      if (global.value.type === "function" || global.value.type === "table") this.lua.set(global.name, global);
      else if (global.value.value !== undefined) this.constants.set(global.name, global);
    }

    this.index = this.buildIndex();
  }

  /**
   * Search entries: what can be found by name and where it leads. `name` is the short name ranked against the
   * query, `text` the whole label searched; `owner`, `sig` and `fn` let a hit show a signature.
   */
  buildIndex() {
    const entries = [];
    const add = (name, kind, route, label = name, extra = {}) =>
      entries.push({ name: name.toLowerCase(), text: label.toLowerCase(), label, kind, route, ...extra });
    for (const cls of this.classes.values()) {
      add(cls.name, "class", `class/${cls.name}`);
      for (const member of cls.members.values()) {
        add(member.name, "method", `class/${cls.name}/${member.name}`, `${cls.name}:${member.name}`,
          { owner: cls.name, sig: member.kind, fn: member.fn });
      }
    }
    for (const type of this.valueTypes.values()) {
      add(type.name, "type", `type/${type.name}`);
      for (const member of this.typeMethods(type)) {
        const probed = type.value.probe?.methods?.[member];
        add(member, "method", `type/${type.name}/${member}`, `${type.name}:${member}`,
          { owner: type.name, sig: probed ? "probe" : "unknown", fn: probed });
      }
    }
    for (const fn of this.functions.values()) add(fn.name, "function", `function/${fn.name}`, fn.name, { sig: "bound", fn: fn.value });
    for (const instance of this.instances.values()) add(instance.name, "instance", `class/${instance.value}`, `${instance.name} → ${instance.value}`);
    for (const enumeration of this.enums.values()) {
      add(enumeration.name, "enum", `enum/${enumeration.name}`);
      for (const value of Object.keys(enumeration.value)) add(value, "enum value", `enum/${enumeration.name}/${value}`);
    }
    for (const global of this.lua.values()) {
      if (global.value.type === "function") {
        add(global.name, "Lua", `global/${global.name}`, global.name, { sig: "plain", fn: global.value.fn });
        continue;
      }
      add(global.name, "table", `global/${global.name}`);
      for (const [member, info] of Object.entries(global.value.members ?? {})) {
        if (info.type === "function") add(member, "Lua", `global/${global.name}/${member}`, `${global.name}.${member}`, { sig: "plain", fn: info.fn });
      }
    }
    for (const constant of this.constants.keys()) add(constant, "constant", `constants/${constant}`);
    return entries;
  }

  /**
   * Entries whose label matches the query (matchesWords): "baseentity origin" finds CBaseEntity:GetAbsOrigin,
   * since the label includes the owner of a member. Best first, at most SEARCH_LIMIT.
   */
  search(query) {
    const words = queryWords(query);
    if (!words.length) return [];
    return this.index
      .filter((entry) => matchesWords(entry.text, words))
      .sort((a, b) => rank(a, words) - rank(b, words) || a.label.length - b.label.length || a.label.localeCompare(b.label))
      .slice(0, SEARCH_LIMIT);
  }

  /** Methods of a value type: its functions except metamethods, by name. */
  typeMethods(type) {
    const { members } = type.value;
    return Object.keys(members).filter((key) => members[key] === "function" && !key.startsWith("__")).sort();
  }

  isType(name) {
    return this.classes.has(name) || this.valueTypes.has(name) || this.enums.has(name);
  }

  typeRoute(name) {
    if (this.classes.has(name)) return `class/${name}`;
    if (this.valueTypes.has(name)) return `type/${name}`;
    return `enum/${name}`;
  }

  /** Bases of a class on one side, root first, ending with the class itself. */
  chain(name, side) {
    const chain = [name];
    for (let base = this.classes.get(name)?.baseOn[side]; base && !chain.includes(base); base = this.classes.get(base)?.baseOn[side]) {
      chain.unshift(base);
    }
    return chain;
  }

  /** Ancestors of a class on any side, nearest first. */
  ancestors(cls) {
    const ancestors = [];
    const queue = [...cls.bases];
    while (queue.length) {
      const base = queue.shift();
      if (ancestors.includes(base) || !this.classes.has(base)) continue;
      ancestors.push(base);
      queue.push(...this.classes.get(base).bases);
    }
    return ancestors;
  }

  /**
   * Members a class inherits, grouped by ancestor, nearest first. Each side walks its own chain: there a member
   * comes from the nearest class that has it on that side, so one overridden closer is not repeated. The `sides`
   * of a member are the sides it is inherited on: a method of CEntityInstance, which both VMs have, is server-only
   * in a server-only class; on the client CBaseAnimatingActivity inherits from C_BaseModelEntity, not CBaseModelEntity.
   * @returns {{ ancestor: string, members: object[] }[]} groups with at least one member
   */
  inherited(cls) {
    /** @type {Map<string, Map<string, object>>} ancestor → member name → member with the sides it is inherited on */
    const given = new Map();
    for (const side of cls.sides) {
      const seen = new Set();
      for (const name of this.chain(cls.name, side).reverse()) {
        for (const member of this.classes.get(name)?.members.values() ?? []) {   // a base may be undeclared
          if (!member.sides.has(side) || seen.has(member.name)) continue;
          seen.add(member.name);
          if (name === cls.name) continue;
          if (!given.has(name)) given.set(name, new Map());
          const members = given.get(name);
          if (!members.has(member.name)) members.set(member.name, { ...member, sides: new Set() });
          members.get(member.name).sides.add(side);
        }
      }
    }
    return this.ancestors(cls).filter((ancestor) => given.has(ancestor)).map((ancestor) => ({
      ancestor,
      members: [...given.get(ancestor).values()].sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }

  /**
   * Classes of one side as an inheritance forest. Each side has its own: a class on both sides may have a
   * different base on each (CBaseAnimatingActivity: CBaseModelEntity on the server, C_BaseModelEntity on the
   * client). Every class without a base on that side is a root.
   * @returns {{ roots: string[], children: Map<string, string[]>, size: number }} names sorted
   */
  classForest(side) {
    const names = [...this.classes.values()].filter((cls) => cls.sides.has(side)).map((cls) => cls.name).sort(byName);
    const children = new Map();
    const roots = [];
    for (const name of names) {
      const base = this.classes.get(name).baseOn[side];
      if (base && this.classes.get(base)?.sides.has(side)) {
        if (!children.has(base)) children.set(base, []);
        children.get(base).push(name);
      } else {
        roots.push(name);
      }
    }
    return { roots, children, size: names.length };
  }
}

const byName = (a, b) => a.localeCompare(b);

/** Exact name first, then a name, then a label starting with the first word, then the rest. */
function rank(entry, words) {
  const query = words.join(" ");
  return entry.name === query ? 0 : entry.name.startsWith(words[0]) ? 1 : entry.text.startsWith(words[0]) ? 2 : 3;
}
