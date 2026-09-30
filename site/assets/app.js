// Browser for the Dota 2 modding data: reads data/index.json and the dumps it lists, renders everything
// client-side. Routes live in the hash: #/<dataset>/<page>/<name>[/<member>].

// The deployed site has data/ next to it; a local server started at the repository root has it one level up.
const DATA_ROOTS = ["data/", "../data/"];

const view = document.getElementById("view");
const nav = document.getElementById("nav");
const search = document.getElementById("search");

let dataRoot = null;
let manifest = null;
/** Class shown in the view, marked in the navigation tree. */
let currentClass = null;

// Sidebar sections are open by default; the ones a visitor collapses are remembered in this browser.
const COLLAPSED_KEY = "dota2modding.nav.collapsed";
const collapsed = loadCollapsed();

function loadCollapsed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveCollapsed() {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...collapsed]));
  } catch {
    // Storage unavailable (private mode, blocked): the state lives for this page only.
  }
}
/** @type {Map<string, VscriptsModel>} dataset id → loaded model */
const models = new Map();

// ---------------------------------------------------------------------------------------------------------
// DOM helpers

/** Element with attributes and children; strings become text nodes, so engine text is never parsed as HTML. */
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const link = (route, text) => el("a", { href: `#/${route}` }, text);
/** Collapsible sidebar section with a stable id; open unless the visitor collapsed it before. */
const collapsible = (id, attrs, summary, ...content) =>
  el("details", { ...attrs, "data-id": id, open: !collapsed.has(id) }, summary, content);
/** Replaces the children of a node; nested arrays are flattened and empty values skipped. */
const fill = (parent, ...nodes) => parent.replaceChildren(...nodes.flat(Infinity).filter((node) => node !== null && node !== undefined && node !== false));
const show = (...nodes) => fill(view, ...nodes);

async function fetchJson(path) {
  const response = await fetch(dataRoot + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

// ---------------------------------------------------------------------------------------------------------
// VScripts API model: the server and client dumps merged, every declaration knows the sides it exists on.

class VscriptsModel {
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

  /** Search entries: what can be found by name and where it leads. */
  buildIndex() {
    const entries = [];
    const add = (name, kind, route, label = name) =>
      entries.push({ name: name.toLowerCase(), text: label.toLowerCase(), label, kind, route });
    for (const cls of this.classes.values()) {
      add(cls.name, "class", `class/${cls.name}`);
      for (const member of cls.members.keys()) add(member, "method", `class/${cls.name}/${member}`, `${cls.name}:${member}`);
    }
    for (const type of this.valueTypes.values()) {
      add(type.name, "type", `type/${type.name}`);
      for (const [member, kind] of Object.entries(type.value.members)) {
        if (kind === "function" && !member.startsWith("__")) add(member, "method", `type/${type.name}/${member}`, `${type.name}:${member}`);
      }
    }
    for (const fn of this.functions.keys()) add(fn, "function", `function/${fn}`);
    for (const instance of this.instances.values()) add(instance.name, "instance", `class/${instance.value}`, `${instance.name} → ${instance.value}`);
    for (const enumeration of this.enums.values()) {
      add(enumeration.name, "enum", `enum/${enumeration.name}`);
      for (const value of Object.keys(enumeration.value)) add(value, "enum value", `enum/${enumeration.name}/${value}`);
    }
    for (const global of this.lua.values()) {
      add(global.name, global.value.type === "table" ? "table" : "Lua", `global/${global.name}`);
      for (const [member, info] of Object.entries(global.value.members ?? {})) {
        if (info.type === "function") add(member, "Lua", `global/${global.name}/${member}`, `${global.name}.${member}`);
      }
    }
    for (const constant of this.constants.keys()) add(constant, "constant", `constants/${constant}`);
    return entries;
  }

  isType(name) {
    return this.classes.has(name) || this.valueTypes.has(name) || this.enums.has(name);
  }

  typeRoute(name) {
    if (this.classes.has(name)) return `class/${name}`;
    if (this.valueTypes.has(name)) return `type/${name}`;
    return `enum/${name}`;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Rendering pieces

function sidePills(model, sides) {
  if (sides.size === model.sides.length) return null;
  return [...sides].map((side) => el("span", { class: `pill ${side}` }, side === "server" ? "server" : "client"));
}

function typeNode(model, type) {
  return model.isType(type) ? link(`${model.id}/${model.typeRoute(type)}`, type) : type;
}

/** Signature of a function described by the engine: name(param: type, …): returns. */
function boundSignature(model, name, fn) {
  const params = fn.params.map((param, index) => [
    index ? ", " : "", param.name || `${param.type.replace(/\W/g, "") || "arg"}_${index + 1}`, ": ", typeNode(model, param.type),
  ]);
  const returns = fn.returns && fn.returns !== "void" ? [": ", typeNode(model, fn.returns)] : [];
  return el("code", { class: "sig" }, name, "(", params, ")", returns);
}

/** Signature of a Lua-defined or native function: only parameter names are known. */
function plainSignature(name, fn, method) {
  if (fn.native) return el("code", { class: "sig" }, name, "(...)");
  const params = method && fn.params[0] === "self" ? fn.params.slice(1) : fn.params;
  return el("code", { class: "sig" }, name, `(${[...params, ...(fn.vararg ? ["..."] : [])].join(", ")})`);
}

/** Signature of a class member; `name` may be a link. */
function memberSignature(model, name, member) {
  return member.kind === "bound" ? boundSignature(model, name, member.fn) : plainSignature(name, member.fn, true);
}

function sourceNote(fn) {
  return fn.source ? el("div", { class: "note" }, `Defined in ${fn.source.replace(/\\/g, "/")}:${fn.lines[0]}`) : null;
}

/** A documented member; `id` (for #/…/<member> links) is omitted for members listed on another class's page. */
function memberBlock(model, id, signature, sides, fn) {
  return el("div", { class: "member", id: id === null ? null : `m-${id}` },
    signature, " ", sidePills(model, sides),
    fn?.desc ? el("div", { class: "desc" }, fn.desc) : null,
    fn ? sourceNote(fn) : null);
}

function focusMember(member) {
  if (!member) return;
  const node = document.getElementById(`m-${member}`);
  if (!node) return;
  node.classList.add("focus");
  node.scrollIntoView({ block: "center" });
}

// ---------------------------------------------------------------------------------------------------------
// Pages

function pageHome() {
  show(
    el("h1", {}, "Dota 2 Modding"),
    el("p", { class: "muted" }, "Data for Dota 2 custom game development, taken from the game itself."),
    el("div", { class: "cards" }, manifest.datasets.map((dataset) =>
      el("a", { class: "card", href: `#/${dataset.id}` }, el("strong", {}, dataset.title), el("span", { class: "muted" }, dataset.description)))),
  );
}

function pageOverview(model) {
  const { dataset } = model;
  const files = Object.entries(dataset.files);
  const annotationsUrl = `${manifest.repository}/tree/main/${dataset.annotations}`;
  show(
    el("h1", {}, dataset.title),
    el("p", {}, dataset.description),
    el("h2", {}, "Game build"),
    el("table", {},
      el("tr", {}, el("th", {}, "Side"), el("th", {}, "Version"), el("th", {}, "Revision"), el("th", {}, "Date")),
      model.sides.map((side) => el("tr", {}, el("td", {}, side), el("td", {}, model.builds[side].clientVersion),
        el("td", {}, model.builds[side].sourceRevision), el("td", {}, model.builds[side].versionDate)))),
    el("h2", {}, "Contents"),
    el("div", { class: "meta" },
      el("span", {}, `classes: ${model.classes.size}`),
      el("span", {}, link(`${model.id}/functions`, `functions: ${model.functions.size}`)),
      el("span", {}, link(`${model.id}/instances`, `instances: ${model.instances.size}`)),
      el("span", {}, `enums: ${model.enums.size}`),
      el("span", {}, link(`${model.id}/constants`, `constants: ${model.constants.size}`)),
      el("span", {}, `core Lua: ${model.lua.size}`)),
    el("p", {}, "Marked ", el("span", { class: "pill server" }, "server"), " or ", el("span", { class: "pill client" }, "client"),
      " — exists on that side only; unmarked — on both."),
    el("h2", {}, "Download"),
    el("p", {}, "Raw dumps: ", files.map(([side, path], i) => [i ? ", " : "", el("a", { href: dataRoot + path }, `${side}.json`)]),
      ". Format — ", el("a", { href: `${manifest.repository}/tree/main/data/${model.id}` }, "described in the repository"), "."),
    el("p", {}, "EmmyLua annotations: ", el("a", { href: annotationsUrl }, dataset.annotations),
      ". Add them as a library in the project's .emmyrc.json:"),
    el("pre", {}, el("code", {}, `{\n  "workspace": {\n    "library": ["<path to the repository>/${dataset.annotations}"]\n  }\n}`)),
  );
}

function pageClass(model, name, member) {
  const cls = model.classes.get(name);
  if (!cls) return pageMissing(name);
  const ancestors = [];
  const queue = [...cls.bases];
  while (queue.length) {
    const base = queue.shift();
    if (ancestors.includes(base) || !model.classes.has(base)) continue;
    ancestors.push(base);
    queue.push(...model.classes.get(base).bases);
  }
  const members = [...cls.members.values()].sort((a, b) => a.name.localeCompare(b.name));
  show(
    el("h1", {}, cls.name, " ", sidePills(model, cls.sides)),
    el("div", { class: "meta" },
      cls.bases.size ? el("span", {}, "base: ", [...cls.bases].map((base, i) => [i ? ", " : "", typeNode(model, base)])) : null,
      cls.instances.length ? el("span", {}, "instance: ", cls.instances.join(", ")) : null,
      el("span", {}, `methods: ${members.length}`)),
    cls.derived.length ? el("details", { class: "section" }, el("summary", {}, `Derived classes (${cls.derived.length})`),
      el("ul", { class: "column" }, cls.derived.map((derived) => el("li", {}, typeNode(model, derived))))) : null,
    el("h2", {}, "Methods"),
    members.length ? members.map((m) => memberBlock(model, m.name, memberSignature(model, m.name, m), m.sides, m.fn))
      : el("p", { class: "muted" }, "No own methods."),
    inheritedSections(model, cls, ancestors),
  );
  currentClass = cls.name;
  if (!search.value.trim()) revealInNav(cls.name);
  focusMember(member);
}

/** Collapsed "Inherited from" sections, nearest ancestor first; a method overridden closer is not repeated. */
function inheritedSections(model, cls, ancestors) {
  const seen = new Set(cls.members.keys());
  return ancestors.map((ancestor) => {
    const inherited = [...model.classes.get(ancestor).members.values()]
      .filter((m) => !seen.has(m.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const m of inherited) seen.add(m.name);
    if (!inherited.length) return null;
    return el("details", { class: "section" },
      el("summary", {}, `Inherited from ${ancestor} (${inherited.length})`),
      inherited.map((m) => memberBlock(model, null,
        memberSignature(model, link(`${model.id}/class/${ancestor}/${m.name}`, m.name), m), m.sides, m.fn)));
  });
}

function pageValueType(model, name, member) {
  const type = model.valueTypes.get(name);
  if (!type) return pageMissing(name);
  const { members, probe } = type.value;
  const operand = (kind) => (kind === "self" ? name : "number");
  const methods = Object.keys(members).filter((key) => members[key] === "function" && !key.startsWith("__")).sort();
  show(
    el("h1", {}, name, " ", sidePills(model, type.sides)),
    probe ? el("p", { class: "muted" }, "Fields, operators and signatures were found by trying a sample made by ",
      el("code", {}, `${name}()`), "; parameter names are unknown.") : null,
    probe && Object.keys(probe.fields).length ? [el("h2", {}, "Fields"), el("table", {},
      Object.entries(probe.fields).map(([field, kind]) => el("tr", {}, el("td", {}, el("code", {}, field)), el("td", {}, typeNode(model, kind)))))] : null,
    probe?.operators?.length ? [el("h2", {}, "Operators"), el("table", {}, probe.operators.map((op) => el("tr", {},
      el("td", {}, el("code", {}, op.left === undefined ? `${op.op} ${name}` : `${operand(op.left)} ${op.op} ${operand(op.right)}`)),
      el("td", {}, "→ ", typeNode(model, op.result)))))] : null,
    el("h2", {}, "Methods"),
    methods.map((m) => {
      const probed = probe?.methods?.[m];
      const signature = probed
        ? el("code", { class: "sig" }, m, "(", probed.params.map((kind, i) => [i ? ", " : "", `arg${i + 1}: `, typeNode(model, operand(kind))]), ")",
          probed.result === "nil" ? [] : [": ", typeNode(model, probed.result)])
        : el("code", { class: "sig" }, `${m}(...)`);
      return memberBlock(model, m, signature, type.sides, null);
    }),
  );
  focusMember(member);
}

function pageFunction(model, name) {
  const fn = model.functions.get(name);
  if (!fn) return pageMissing(name);
  show(el("h1", {}, name, " ", sidePills(model, fn.sides)), memberBlock(model, name, boundSignature(model, name, fn.value), fn.sides, fn.value));
}

function pageFunctions(model) {
  const all = [...model.functions.values()].sort((a, b) => a.name.localeCompare(b.name));
  show(el("h1", {}, "Global functions"), all.map((fn) => memberBlock(model, fn.name, boundSignature(model, fn.name, fn.value), fn.sides, fn.value)));
}

function pageInstances(model) {
  show(el("h1", {}, "Instances"), el("table", {}, [...model.instances.values()].sort((a, b) => a.name.localeCompare(b.name)).map((instance) =>
    el("tr", {}, el("td", {}, el("code", {}, instance.name), " ", sidePills(model, instance.sides)), el("td", {}, typeNode(model, instance.value))))));
}

function pageEnum(model, name, member) {
  const enumeration = model.enums.get(name);
  if (!enumeration) return pageMissing(name);
  const values = Object.entries(enumeration.value).sort((a, b) => (a[1].value ?? 0) - (b[1].value ?? 0));
  show(
    el("h1", {}, name, " ", sidePills(model, enumeration.sides)),
    el("table", {}, el("tr", {}, el("th", {}, "Name"), el("th", {}, "Value"), el("th", {}, "Description")),
      values.map(([value, info]) => el("tr", { id: `m-${value}`, class: "member" },
        el("td", {}, el("code", {}, value)), el("td", {}, info.value ?? "—"), el("td", {}, info.desc)))),
  );
  focusMember(member);
}

function pageGlobal(model, name, member) {
  const global = model.lua.get(name);
  if (!global) return pageMissing(name);
  if (global.value.type === "function") {
    show(el("h1", {}, name, " ", sidePills(model, global.sides)), memberBlock(model, name, plainSignature(name, global.value.fn, false), global.sides, global.value.fn));
    return;
  }
  const members = Object.entries(global.value.members ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  show(
    el("h1", {}, name, " ", sidePills(model, global.sides)),
    el("p", { class: "muted" }, "Global table."),
    members.map(([key, info]) => memberBlock(model, key,
      info.type === "function" ? plainSignature(`${name}.${key}`, info.fn, false) : el("code", { class: "sig" }, `${name}.${key}: ${info.type}`),
      global.sides, info.fn)),
  );
  focusMember(member);
}

function pageConstants(model, name) {
  const all = [...model.constants.values()].sort((a, b) => a.name.localeCompare(b.name));
  const table = el("table", {});
  const render = (query) => {
    const needle = query.trim().toLowerCase();
    const rows = all.filter((constant) => !needle || constant.name.toLowerCase().includes(needle)).slice(0, 500);
    fill(table, el("tr", {}, el("th", {}, "Name"), el("th", {}, "Value")), rows.map((constant) =>
      el("tr", { id: `m-${constant.name}`, class: "member" }, el("td", {}, el("code", {}, constant.name), " ", sidePills(model, constant.sides)),
        el("td", {}, el("code", {}, JSON.stringify(constant.value.value))))));
  };
  const filter = el("input", { class: "filter", type: "search", placeholder: "Filter by name", value: name ?? "", oninput: (event) => render(event.target.value) });
  show(el("h1", {}, "Constants"), el("p", { class: "muted" }, `Numbers and strings in _G outside enums: ${all.length}. Up to 500 shown.`), filter, table);
  render(name ?? "");
  focusMember(name);
}

function pageMissing(name) {
  show(el("h1", {}, "Not found"), el("p", { class: "muted" }, name ?? ""));
}

// ---------------------------------------------------------------------------------------------------------
// Navigation: grouped lists or search hits

function renderNav(model) {
  if (!model) {
    nav.replaceChildren();
    return;
  }
  const query = search.value.trim().toLowerCase();
  if (query) {
    // Words in any order: "spawn table" finds SpawnEntityFromTableAsynchronous; "baseentity origin" finds
    // CBaseEntity:GetAbsOrigin, since the text includes the owner of a member.
    const words = query.split(/\s+/);
    const hits = model.index
      .filter((entry) => words.every((word) => entry.text.includes(word)))
      .sort((a, b) => rank(a, words) - rank(b, words) || a.label.length - b.label.length || a.label.localeCompare(b.label))
      .slice(0, 300);
    fill(nav, el("ul", {}, hits.map((hit) =>
      el("li", { class: "hit" }, el("span", { class: "kind" }, hit.kind), link(`${model.id}/${hit.route}`, hit.label)))),
    hits.length ? null : el("p", { class: "muted" }, "Nothing found"));
    return;
  }
  const group = (title, names, route) =>
    collapsible(`${model.id}:group:${title}`, { class: "group" }, el("summary", {}, `${title} (${names.length})`),
      el("ul", {}, names.map((name) => el("li", {}, link(`${model.id}/${route(name)}`, name)))));
  const sorted = (map) => [...map.keys()].sort((a, b) => a.localeCompare(b));
  fill(nav,
    el("ul", {}, el("li", {}, link(model.id, "Overview")), el("li", {}, link(`${model.id}/functions`, "Global functions")),
      el("li", {}, link(`${model.id}/instances`, "Instances")), el("li", {}, link(`${model.id}/constants`, "Constants"))),
    model.sides.map((side) => classTree(model, side)),
    group("Value types", sorted(model.valueTypes), (name) => `type/${name}`),
    group("Enums", sorted(model.enums), (name) => `enum/${name}`),
    group("Functions", sorted(model.functions), (name) => `function/${name}`),
    group("Core Lua", sorted(model.lua), (name) => `global/${name}`),
  );
  if (currentClass) revealInNav(currentClass);
}

/**
 * Classes of one side as an inheritance tree. Each side has its own tree: a class on both sides may have a
 * different base on each (CBaseAnimatingActivity: CBaseModelEntity on the server, C_BaseModelEntity on the
 * client). Every class without a base is a root, with or without derived classes.
 */
function classTree(model, side) {
  const names = [...model.classes.values()].filter((cls) => cls.sides.has(side)).map((cls) => cls.name);
  const children = new Map();
  const roots = [];
  for (const name of names) {
    const base = model.classes.get(name).baseOn[side];
    if (base && model.classes.get(base)?.sides.has(side)) {
      if (!children.has(base)) children.set(base, []);
      children.get(base).push(name);
    } else {
      roots.push(name);
    }
  }
  const byName = (a, b) => a.localeCompare(b);
  const classLink = (name) => el("a", { href: `#/${model.id}/class/${name}`, "data-class": name, title: name }, name);
  const node = (name) => {
    const derived = (children.get(name) ?? []).sort(byName);
    if (!derived.length) return el("li", {}, classLink(name));
    return el("li", {}, collapsible(`${model.id}:${side}:${name}`, {}, el("summary", {}, classLink(name)), el("ul", {}, derived.map(node))));
  };
  const title = model.sides.length > 1 ? `${side[0].toUpperCase()}${side.slice(1)} classes` : "Classes";
  return collapsible(`${model.id}:classes:${side}`, { class: "group" }, el("summary", {}, `${title} (${names.length})`),
    el("ul", { class: "tree" }, roots.sort(byName).map(node)));
}

/** Marks the class in the navigation trees and opens the branches that lead to it. */
function revealInNav(name) {
  for (const a of nav.querySelectorAll("a.current")) a.classList.remove("current");
  const targets = [...nav.querySelectorAll("a[data-class]")].filter((a) => a.dataset.class === name);
  for (const a of targets) {
    a.classList.add("current");
    for (let details = a.parentElement.closest("details"); details; details = details.parentElement.closest("details")) {
      if (details.querySelector(":scope > summary") !== a.parentElement) details.open = true;
    }
  }
  targets[0]?.scrollIntoView({ block: "nearest" });
}

/** Exact name first, then a name, then a text starting with the first word, then the rest. */
function rank(entry, words) {
  const query = words.join(" ");
  return entry.name === query ? 0 : entry.name.startsWith(words[0]) ? 1 : entry.text.startsWith(words[0]) ? 2 : 3;
}

// ---------------------------------------------------------------------------------------------------------
// Routing

async function loadModel(dataset) {
  if (!models.has(dataset.id)) {
    const dumps = {};
    for (const [side, path] of Object.entries(dataset.files)) dumps[side] = await fetchJson(path);
    models.set(dataset.id, new VscriptsModel(dataset, dumps));
  }
  return models.get(dataset.id);
}

let currentModel = null;

async function route() {
  const [datasetId, page, name, member] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  for (const a of document.querySelectorAll("#datasets a")) a.classList.toggle("active", a.dataset.id === datasetId);
  const dataset = manifest.datasets.find((d) => d.id === datasetId);
  if (!dataset) {
    currentModel = null;
    renderNav(null);
    return pageHome();
  }
  if (dataset.kind !== "vscripts-api") return pageMissing(`No viewer for dataset kind ${dataset.kind}`);
  view.replaceChildren(el("p", { class: "muted" }, "Loading…"));
  const model = await loadModel(dataset);
  if (model !== currentModel) {
    currentModel = model;
    renderNav(model);
  }
  currentClass = null;
  for (const a of nav.querySelectorAll("a.current")) a.classList.remove("current");
  const pages = {
    undefined: () => pageOverview(model),
    "": () => pageOverview(model),
    class: () => pageClass(model, name, member),
    type: () => pageValueType(model, name, member),
    function: () => pageFunction(model, name),
    functions: () => pageFunctions(model),
    instances: () => pageInstances(model),
    enum: () => pageEnum(model, name, member),
    global: () => pageGlobal(model, name, member),
    constants: () => pageConstants(model, name),
  };
  (pages[page] ?? (() => pageMissing(page)))();
  if (!member) view.scrollTop = 0;
}

async function start() {
  for (const root of DATA_ROOTS) {
    try {
      const response = await fetch(`${root}index.json`);
      if (response.ok) {
        dataRoot = root;
        manifest = await response.json();
        break;
      }
    } catch {
      // try the next location
    }
  }
  if (!manifest) return show(el("h1", {}, "No data"), el("p", { class: "muted" }, "data/index.json was not found."));
  document.getElementById("repo").href = manifest.repository;
  document.getElementById("datasets").replaceChildren(...manifest.datasets.map((dataset) =>
    el("a", { href: `#/${dataset.id}`, "data-id": dataset.id }, dataset.title)));
  // "toggle" does not bubble; a capturing listener on the sidebar still sees it.
  nav.addEventListener("toggle", (event) => {
    const id = event.target.dataset?.id;
    if (!id) return;
    if (event.target.open) collapsed.delete(id);
    else collapsed.add(id);
    saveCollapsed();
  }, true);
  let timer = null;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => renderNav(currentModel), 120);
  });
  window.addEventListener("hashchange", () => route().catch(showError));
  await route();
}

function showError(error) {
  show(el("h1", {}, "Error"), el("pre", {}, String(error?.stack ?? error)));
}

start().catch(showError);
