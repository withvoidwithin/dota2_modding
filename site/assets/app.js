// Browser for the Dota 2 modding data: reads data/index.json and the dumps it lists, renders everything
// client-side. Routes live in the hash: #/<dataset>/<page>/<name>[/<member>].
import { CHANGE_KINDS, buildId, entryPath, latestMarks } from "./changelog.js";
import { ENTITY_KINDS, SEARCH_LIMIT, VscriptsModel, isNewerBuild, matchesWords, queryWords } from "./model.js";

// The deployed site has data/ next to it; a local server started at the repository root has it one level up.
const DATA_ROOTS = ["data/", "../data/"];
// Steam product info as JSON with CORS (community service steamcmd.net): the current public build of an app.
// Steam's own ISteamApps/UpToDateCheck does not fit: it reports only the oldest still compatible version (any
// recent version is "up to date"), and api.steampowered.com sends no CORS headers.
const STEAM_INFO_URL = (appId) => `https://api.steamcmd.net/v1/info/${appId}`;
const SITE_TITLE = "Dota 2 Modding";

const app = document.body;
const view = document.getElementById("view");
const nav = document.getElementById("nav");
const search = document.getElementById("search");
const menuButton = document.querySelector(".top__menu");

let dataRoot = null;
let manifest = null;
/** @type {Map<string, VscriptsModel>} dataset id → loaded model */
const models = new Map();
/** @type {Map<string, object | null>} dataset id → its changelog (see loadChangelog); null when it has none */
const changelogs = new Map();
/** Model of the dataset in the route; null on Home. */
let currentModel = null;

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

// Theme: the system's unless the visitor picked the other one; the pick is data-theme on <html>, restored by
// the inline script of index.html before the first paint.
const THEME_KEY = "dota2modding.theme";
const themeButton = document.querySelector(".theme-toggle");
const systemLight = matchMedia("(prefers-color-scheme: light)");
const systemTheme = () => (systemLight.matches ? "light" : "dark");
const shownTheme = () => document.documentElement.dataset.theme || systemTheme();

/** The button shows the theme it switches to. */
function renderThemeButton() {
  const next = shownTheme() === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;
  themeButton.replaceChildren(icon(next === "dark" ? "moon" : "sun", "lg"));
  themeButton.setAttribute("aria-label", label);
  themeButton.title = label;
}

/** Switches to the other theme; picking the system's one forgets the pick, so the page follows the system again. */
function toggleTheme() {
  const next = shownTheme() === "dark" ? "light" : "dark";
  const picked = next === systemTheme() ? null : next;
  if (picked) document.documentElement.dataset.theme = picked;
  else delete document.documentElement.dataset.theme;
  try {
    if (picked) localStorage.setItem(THEME_KEY, picked);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Storage unavailable: the theme holds for this page only.
  }
  renderThemeButton();
}

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

/** Replaces the children of a node; nested arrays are flattened and empty values skipped. */
const fill = (parent, ...nodes) => parent.replaceChildren(...nodes.flat(Infinity).filter((node) => node !== null && node !== undefined && node !== false));
/** Shows a page in the main area. */
const show = (...nodes) => fill(view, el("div", { class: "page" }, nodes));
/** Collapsible sidebar section with a stable id; open unless the visitor collapsed it before. */
const collapsible = (id, attrs, summary, ...content) =>
  el("details", { ...attrs, "data-id": id, open: !collapsed.has(id) }, summary, content);
const count = (value) => el("span", { class: "count" }, value);
const code = (text) => el("code", {}, text);
const capitalize = (text) => text[0].toUpperCase() + text.slice(1);

/** Long engine identifiers break after "_" first: CDOTA_<wbr>BaseNPC_<wbr>Hero. */
const breaks = (name) => name.split(/(?<=_)/).flatMap((part, i) => (i ? [el("wbr"), part] : [part]));

// Line icons, 16×16, stroked by the stylesheet: a string is a path, an array is a circle (cx, cy, r).
const ICONS = {
  overview: ["M2.5 2.5h11v11h-11zM2.5 6h11M6 6v7.5"],
  function: ["M11 2.5c-1.8 0-2.4.8-2.7 2.6l-1.3 6.8c-.3 1.6-.9 2.1-2.5 2.1M5.5 6.5h5"],
  instance: ["M8 2l5.5 3v6L8 14l-5.5-3V5zM2.5 5L8 8l5.5-3M8 8v6"],
  constant: ["M6.2 2.5l-1.2 11M11 2.5l-1.2 11M3 6h10.5M2.5 10h10.5"],
  entity: ["M2.5 2.5h11v11h-11zM8 5.5v5M5.5 8h5"],
  arrow: ["M3 8h10M9 4l4 4-4 4"],
  external: ["M9 2.5h4.5V7M13.5 2.5L7.5 8.5M12 9.5v4H2.5V4h4"],
  spinner: ["M8 2.5a5.5 5.5 0 1 1-5.5 5.5"],
  check: ["M3.5 8.5l3 3 6-7"],
  warning: ["M8 2.2l6.2 11.3H1.8z", "M8 6.5v3M8 11.6v.1"],
  question: [[8, 8, 6], "M6.3 6.4a1.8 1.8 0 1 1 2.6 1.6c-.6.3-.9.7-.9 1.3M8 11.3v.1"],
  download: ["M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10"],
  file: ["M4 2h5l3 3v9H4zM9 2v3h3"],
  braces: ["M6 2.5c-1.4 0-2 .6-2 2V6c0 1-.5 1.6-1.5 2 1 .4 1.5 1 1.5 2v1.5c0 1.4.6 2 2 2M10 2.5c1.4 0 2 .6 2 2V6c0 1 .5 1.6 1.5 2-1 .4-1.5 1-1.5 2v1.5c0 1.4-.6 2-2 2"],
  extension: ["M2.5 2.5h4.5V7H2.5zM9 9h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM11.2 2l2.8 2.8-2.8 2.8-2.8-2.8z"],
  copy: ["M5.5 5.5h7v7h-7z", "M10.5 5.5v-2h-7v7h2"],
  filter: ["M2.5 3.5h11l-4.2 5v4.2l-2.6 1.3V8.5z"],
  info: [[8, 8, 6], "M8 7.3v3.7M8 5v.1"],
  missing: ["M4 2h5l3 3v9H4zM9 2v3h3M6.4 8.4l3.2 3.2M9.6 8.4l-3.2 3.2"],
  error: ["M5.5 2h5L14 5.5v5L10.5 14h-5L2 10.5v-5z", "M8 5v3.5M8 11v.1"],
  search: [[7, 7, 4.5], "M10.5 10.5L14 14"],
  enter: ["M13 3.5V8a1.5 1.5 0 0 1-1.5 1.5H3M6 6.5l-3 3 3 3"],
  sun: [[8, 8, 3], "M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"],
  moon: ["M13.5 9.6A5.5 5.5 0 1 1 6.4 2.5a4.5 4.5 0 0 0 7.1 7.1z"],
  history: [[8, 8, 5.5], "M8 5.2V8l2.2 1.4"],
};

const SVG = "http://www.w3.org/2000/svg";

/** Icon by name; `size` is "sm" or "lg". Built from the constant shapes above, never from data. */
function icon(name, size) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", size ? `i i--${size}` : "i");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  for (const shape of ICONS[name]) {
    const node = document.createElementNS(SVG, Array.isArray(shape) ? "circle" : "path");
    if (Array.isArray(shape)) [["cx", shape[0]], ["cy", shape[1]], ["r", shape[2]]].forEach(([key, value]) => node.setAttribute(key, value));
    else node.setAttribute("d", shape);
    svg.append(node);
  }
  return svg;
}

// ---------------------------------------------------------------------------------------------------------
// Data

async function fetchJson(path) {
  const response = await fetch(dataRoot + path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

async function loadModel(dataset) {
  if (!models.has(dataset.id)) {
    const dumps = {};
    for (const [side, path] of Object.entries(dataset.files)) dumps[side] = await fetchJson(path);
    const entities = dataset.entities ? await fetchJson(dataset.entities) : null;
    const model = new VscriptsModel(dataset, dumps, entities);
    changelogs.set(dataset.id, await loadChangelog(dataset, model));
    models.set(dataset.id, model);
  }
  return models.get(dataset.id);
}

/**
 * The changelog of a dataset: { path, first, entries, marks, routes, loaded }. `entries` are what its index lists,
 * newest first: each build, the counts of its changes and the pages it touches, but not the changes, which are a file
 * of an entry each (loadEntry). `marks` come from the newest entry (latestMarks), the only one fetched here.
 * `routes` are the pages that exist now: what the changelog names and no longer exists gets no link. A changelog that
 * is missing or does not load is not an error: the site just has no history.
 */
async function loadChangelog(dataset, model) {
  if (!dataset.changelog) return null;
  try {
    const { first, entries } = await fetchJson(dataset.changelog);
    const routes = new Set([...model.index.map((entry) => entry.route), ...[...model.instances.keys()].map((name) => `instances/${name}`)]);
    const log = { path: dataset.changelog, first, entries, routes, marks: new Map(), loaded: new Map() };
    if (entries.length) log.marks = latestMarks([await loadEntry(log, entries[0])]);
    return log;
  } catch {
    return null;
  }
}

/** An entry of the index with its changes: a promise of the entry file, fetched once. */
function loadEntry(log, summary) {
  const id = buildId(summary.build);
  if (!log.loaded.has(id)) {
    log.loaded.set(id, fetchJson(entryPath(log.path, summary.build)).catch((error) => {
      log.loaded.delete(id);   // a failed fetch may be tried again
      throw error;
    }));
  }
  return log.loaded.get(id);
}

const changelogOf = (model) => changelogs.get(model.id) ?? null;

let steamBuild = null;

/** Current public Steam build of the game: { id, time } or null when it cannot be checked. Asked once per visit. */
function currentSteamBuild() {
  const appId = manifest.steamAppId;
  steamBuild ??= fetch(STEAM_INFO_URL(appId))
    .then((response) => (response.ok ? response.json() : null))
    .then((info) => {
      const branch = info?.data?.[appId]?.depots?.branches?.public;
      return branch ? { id: branch.buildid, time: Number(branch.timebuildupdated) } : null;
    })
    .catch(() => null);
  return steamBuild;
}

// Dates are shown as YYYY.MM.DD everywhere.
const MONTHS = "JanFebMarAprMayJunJulAugSepOctNovDec";
const ymd = (year, month, day) => `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
/** Steam time (Unix seconds), UTC. */
const steamDate = (seconds) => {
  const date = new Date(seconds * 1000);
  return ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
};
/** VersionDate of steam.inf ("Sep 29 2026"); any other text is shown as it is. */
function versionDate(text) {
  const [, month, day, year] = /^([A-Z][a-z]{2}) +(\d{1,2}) +(\d{4})$/.exec(text ?? "") ?? [];
  const index = month ? MONTHS.indexOf(month) : -1;
  return index >= 0 && index % 3 === 0 ? ymd(year, index / 3 + 1, day) : text;
}
/** Dates of the dumps, without repeats. */
const buildDates = (builds) => [...new Set(Object.values(builds).map((build) => versionDate(build.versionDate)))];
/** Steam build ids of the dumps, without repeats; "unknown" for a dump made before builds were recorded. */
const buildIds = (builds) => [...new Set(Object.values(builds).map((build) => build.steamBuildId ?? "unknown"))];
const codes = (ids) => ids.map((id, i) => [i ? ", " : "", code(id)]);

/** "Build 123 · 2026.09.29", or every build when the dumps come from different ones. */
function buildLine(builds) {
  const ids = buildIds(builds);
  const dates = buildDates(builds);
  return ids.length === 1
    ? ["Build ", code(ids[0]), dates.length === 1 ? ` · ${dates[0]}` : null]
    : ["Builds ", codes(ids)];
}

function footer(builds) {
  const ids = builds ? buildIds(builds) : [];
  return el("footer", { class: "foot" }, "Unofficial project, not affiliated with Valve.",
    ids.length ? [` Data from Dota 2 build${ids.length > 1 ? "s" : ""} `, codes(ids), ` (${buildDates(builds).join(", ")}).`] : null);
}

// ---------------------------------------------------------------------------------------------------------
// Rendering pieces

function sideTag(side, title = `Exists on the ${side} VM only`) {
  return el("span", { class: `side-tag side-tag--${side}`, title }, side);
}

/** Tags of the sides a thing exists on; nothing when they are the sides of its context (the dataset or the class). */
function sideTags(model, sides, context = new Set(model.sides)) {
  if (sides.size === context.size && [...sides].every((side) => context.has(side))) return null;
  return model.sides.filter((side) => sides.has(side)).map((side) => sideTag(side));
}

/** Type in a signature or a table: a link to its page unless it is the page shown (`here`). */
function typeNode(model, type, here) {
  if (type === "<unknown>") return el("span", { class: "sig__type is-unknown" }, type);
  if (model.isType(type) && type !== here) return el("a", { class: "sig__type", href: `#/${model.id}/${model.typeRoute(type)}` }, type);
  return el("span", { class: "sig__type" }, type);
}

/**
 * What a signature shows: parameters ({ name?, type?, anon? }) and the return type or null. A parameter has a name
 * only when it is known: none is made up. `anon` marks a placeholder that is not a name (`...` of a native).
 *   bound   — function described by the engine (FDesc): types, and names when the engine reports them;
 *   plain   — Lua-defined or native function: names only, native ones take anything;
 *   probe   — value type method found by trying a sample: types only;
 *   unknown — value type method the probe could not call.
 */
function signatureParts(sig, fn, { method = false, owner } = {}) {
  if (sig === "bound") {
    return {
      params: fn.params.map((param) => ({ name: param.name || null, type: param.type })),
      returns: fn.returns && fn.returns !== "void" ? fn.returns : null,
    };
  }
  if (sig === "plain") {
    if (fn.native) return { params: [{ name: "...", anon: true }], returns: null };
    const params = method && fn.params[0] === "self" ? fn.params.slice(1) : fn.params;
    return { params: [...params, ...(fn.vararg ? ["..."] : [])].map((name) => ({ name })), returns: null };
  }
  if (sig === "probe") {
    const operand = (kind) => (kind === "self" ? owner : "number");
    return { params: fn.params.map((kind) => ({ type: operand(kind) })), returns: fn.result === "nil" ? null : fn.result };
  }
  return { params: [{ name: "...", anon: true }], returns: null };
}

/**
 * Code signature; `name` is a node, a string or null (search previews show the parameters only). A parameter shows
 * `name: type`, or the one of them it has.
 */
function signature(model, name, { params, returns }, { here, extraClass = "" } = {}) {
  const punct = (text) => el("span", { class: "sig__p" }, text);
  const paramText = (p) => [p.name, p.type].filter(Boolean).join(": ");
  const text = `${name?.textContent ?? name ?? ""}(${params.map(paramText).join(", ")})` + (returns ? `: ${returns}` : "");
  // Length in characters: the font is monospace, so the stylesheet knows the one-line width and puts one parameter
  // per line only when the signature does not fit.
  return el("code", { class: `sig${extraClass}`, style: `--len: ${text.length}` },
    typeof name === "string" ? el("span", { class: "sig__name" }, name) : name,
    punct("("),
    params.map((param, i) => el("span", { class: "sig__param" },
      param.name ? el("span", { class: param.anon ? "sig__pname is-anon" : "sig__pname" }, param.name) : null,
      param.name && param.type ? punct(": ") : null,
      param.type ? typeNode(model, param.type, here) : null,
      i < params.length - 1 ? punct(", ") : null)),
    el("span", { class: "sig__end" }, punct(")"), returns ? [punct(": "), typeNode(model, returns, here)] : null));
}

/** Description of the engine; the "Args: …" / "Params: …" tail it often carries goes to its own line. */
function description(desc) {
  if (!desc) return null;
  const tail = desc.search(/\b(Args|Params):/);
  if (tail < 0) return el("p", { class: "member__desc" }, desc);
  const head = desc.slice(0, tail).trim();
  return [head ? el("p", { class: "member__desc" }, head) : null, el("p", { class: "member__args" }, desc.slice(tail).trim())];
}

const sourceNote = (fn) => (fn?.source
  ? el("p", { class: "member__note" }, "Defined in ", code(`${fn.source.replace(/\\/g, "/")}:${fn.lines[0]}`))
  : null);

/**
 * A documented member. `id` makes it a target of #/…/<member> links; members listed on another class's page
 * have none. `href` is where its name leads, `route` is what the changelog knows it by (changeMark).
 */
function memberBlock(model, { id, name, href, route, parts, sides, context, fn, here }) {
  return el("article", { class: "member", id: id == null ? null : `m-${id}`, "data-name": name, "data-sides": [...sides].join(" ") },
    el("div", { class: "member__head" },
      signature(model, href ? el("a", { class: "sig__name", href: `#/${href}` }, name) : name, parts, { here }),
      changeMark(model, route),
      sideTags(model, sides, context)),
    description(fn?.desc),
    sourceNote(fn));
}

/** Marks the member of the route, opens the section it is in and scrolls to it. */
function focusMember(member) {
  if (!member) return false;
  const node = document.getElementById(`m-${member}`);
  if (!node) return false;
  for (let details = node.closest("details"); details; details = details.parentElement.closest("details")) details.open = true;
  node.classList.add("is-focus");
  node.scrollIntoView({ block: "center" });
  return true;
}

function pageHead({ eyebrow, title, sans = false, tags, lead, facts = [], more }) {
  document.title = `${title} — ${SITE_TITLE}`;
  const shown = facts.filter(Boolean);
  return el("header", { class: "page-head" },
    eyebrow ? el("p", { class: "eyebrow" }, eyebrow) : null,
    el("h1", { class: sans ? "page-title page-title--sans" : "page-title" }, sans ? title : el("span", { class: "ident" }, breaks(title)), tags),
    lead ? el("p", { class: "lead" }, lead) : null,
    shown.length ? el("dl", { class: "facts" }, shown.map(([term, value]) => el("div", {}, el("dt", {}, term), el("dd", {}, value)))) : null,
    more);
}

const block = (title, total, ...content) =>
  el("section", { class: "block" }, el("h2", { class: "block__title" }, title, total === null ? null : [" ", count(total)]), content);

/** A table in its frame. `columns`: [label, class?]; rows are <tr> nodes. */
function table(kind, columns, rows) {
  return el("div", { class: "table-wrap" },
    el("table", { class: `table table--${kind}` },
      el("thead", {}, el("tr", {}, columns.map(([label, cls]) => el("th", { scope: "col", class: cls }, label)))),
      el("tbody", {}, rows)));
}

/** Sticky toolbar with a name filter; `onInput` gets the words of the query (queryWords). */
function filterToolbar(id, label, placeholder, onInput, ...more) {
  const input = el("input", { id, class: "filter__input", type: "search", placeholder, autocomplete: "off", spellcheck: "false",
    oninput: () => onInput(queryWords(input.value)) });
  return el("div", { class: "toolbar" },
    el("div", { class: "filter" }, icon("filter"), el("label", { class: "vh", for: id }, label), input),
    more);
}

/**
 * Radio group drawn as one segmented control. `options`: [value, label, title?], the first one checked;
 * `onChange` gets the value picked.
 */
function segmented(name, groupLabel, options, onChange) {
  return el("div", { class: "segmented", role: "radiogroup", "aria-label": groupLabel },
    options.map(([value, label, title], i) => el("label", { class: `segmented__item segmented__item--${value}`, title },
      el("input", { type: "radio", name, value, checked: i === 0, onchange: () => onChange(value) }),
      el("span", {}, label))));
}

/** "all" and the sides of the model. */
const sideSwitch = (model, name, onChange) => segmented(name, "Side", [
  ["all", "all", "Members of both VMs"],
  ...model.sides.map((side) => [side, side, `Members the ${side} VM has, shared ones included`]),
], onChange);

/**
 * Toolbar of a list of members: the side switch, when not all members are on the same sides, then the name
 * filter. Both apply together (filterMembers). `members` are model entries with `sides`.
 */
function memberToolbar(model, { id, label, members, empty }, ...more) {
  const state = { words: [], side: "all" };
  const apply = () => filterMembers(view, state, empty);
  const toolbar = filterToolbar(id, label, "Filter by name", (words) => { state.words = words; apply(); }, more);
  if (new Set(members.map((member) => [...member.sides].sort().join())).size > 1) {
    toolbar.prepend(sideSwitch(model, `${id}-side`, (side) => { state.side = side; apply(); }));
  }
  return toolbar;
}

/**
 * Filters the members of a page by name words and side ("all" or a side the member has): hides what does not
 * match and the blocks and sections left empty, the count of a block or section becomes what it shows; a name
 * filter also opens the sections with matches. `empty` is shown when nothing matches.
 */
function filterMembers(root, { words, side }, empty) {
  const byName = words.length > 0;
  const filtering = byName || side !== "all";
  let shown = 0;
  for (const member of root.querySelectorAll(".member[data-name]")) {
    const hit = matchesWords(member.dataset.name.toLowerCase(), words) &&
      (side === "all" || (member.dataset.sides ?? "").split(" ").includes(side));
    member.hidden = !hit;
    if (hit) shown++;
  }
  for (const part of root.querySelectorAll(".block, .section:not(.section--plain)")) {
    const visible = part.querySelectorAll(".member:not([hidden])").length;
    const counter = part.querySelector(":scope > :is(.block__title, .section__head) > .count");
    if (counter) counter.textContent = visible;
    part.hidden = filtering && !visible;
    if (byName && part.matches(".section")) part.open = visible > 0;
  }
  empty.hidden = shown > 0;
}

// ---------------------------------------------------------------------------------------------------------
// Changelog pieces: the changes of the API between two dumped builds (changelog.js), as tags on what changed
// in the newest build and as a page of all of them.

const FACET_NAMES = { sides: "sides", signature: "signature", desc: "description", value: "value", base: "base class", class: "class", cls: "C++ class" };
const KIND_TITLES = {
  class: "Classes", method: "Methods", type: "Value types", function: "Global functions", instance: "Instances", enum: "Enums",
  "enum value": "Enum values", Lua: "Core Lua", table: "Lua tables", constant: "Constants", entity: "Entity classes",
};
// What a new or a removed item takes along, by kind: singular and plural.
const MEMBER_NOUNS = { class: ["method", "methods"], type: ["method", "methods"], enum: ["value", "values"], table: ["function", "functions"] };
const OP_SIGNS = { added: "+", removed: "−", changed: "~" };

/** Where a mark of the newest entry comes from, for a tooltip. */
function markTitle({ mark, entry, change, derived }) {
  const when = `build ${buildId(entry.build)} · ${versionDate(entry.build.versionDate)}`;
  if (mark === "new") return `Added in ${when}`;
  return derived ? `Members changed in ${when}` : `Changed in ${when}: ${Object.keys(change.now).map((facet) => FACET_NAMES[facet] ?? facet).join(", ")}`;
}

/**
 * "new" or "updated" for a route the newest entry of the changelog added or changed, else null; a link to the entry
 * (`link: false` where it would sit inside another link).
 */
function changeMark(model, route, { link = true } = {}) {
  const found = changelogOf(model)?.marks.get(route);
  if (!found) return null;
  const attrs = { class: `mark mark--${found.mark}`, title: markTitle(found) };
  return link ? el("a", { ...attrs, href: `#/${model.id}/changelog/${buildId(found.entry.build)}` }, found.mark) : el("span", attrs, found.mark);
}

/** Attributes of a sidebar link: its title and, for what the newest entry changed, the dot the stylesheet draws. */
function navAttrs(model, route, name) {
  const found = changelogOf(model)?.marks.get(route);
  return found ? { title: `${name} — ${markTitle(found).toLowerCase()}`, "data-mark": found.mark } : { title: name };
}

/** "+3 −1 ~38": the counts of added, removed and changed; none are left out. */
function deltas(counts) {
  const shown = Object.keys(OP_SIGNS).filter((op) => counts[op]);
  return el("span", { class: "deltas" }, shown.length
    ? shown.map((op) => el("span", { class: `delta delta--${op}`, title: `${counts[op]} ${op}` }, `${OP_SIGNS[op]}${counts[op]}`))
    : el("span", { class: "muted" }, "no changes"));
}

/** One side of a change: a facet of the item as it was or is now. */
function facetValue(model, change, facet, value) {
  if (value === null || value === undefined) return el("span", { class: "muted" }, "none");
  if (facet === "sides") return model.sides.filter((side) => value.includes(side)).map((side) => sideTag(side));
  if (facet === "signature") {
    const sig = value.returns !== undefined ? "bound" : value.result !== undefined ? "probe" : "plain";
    return signature(model, null, signatureParts(sig, value, { method: change.route.startsWith("class/"), owner: change.route.split("/")[1] }),
      { extraClass: " change__sig" });
  }
  if (facet === "desc") return el("span", { class: "change__text" }, value || "none");
  if (facet === "base") return code(Object.entries(value).map(([side, base]) => `${side}: ${base}`).join(", ") || "none");
  return code(typeof value === "string" ? value : JSON.stringify(value));
}

/** A change as a list item: what happened, to what (a link while the page exists), and from what to what. */
function changeRow(model, change) {
  const name = el("code", { class: "ident" }, breaks(change.label));
  const exists = change.op !== "removed" && changelogOf(model).routes.has(change.route);
  return el("li", { class: `change change--${change.op}` },
    el("span", { class: "change__op", title: capitalize(change.op) }, OP_SIGNS[change.op]),
    el("div", { class: "change__body" },
      el("div", { class: "change__head" },
        exists ? el("a", { href: `#/${model.id}/${change.route}` }, name) : name,
        sideTags(model, new Set(change.sides), change.kind === "entity" ? new Set(change.sides) : undefined),
        change.members ? el("span", { class: "change__members" },
          `${OP_SIGNS[change.op]}${change.members} ${(MEMBER_NOUNS[change.kind] ?? ["member", "members"])[change.members === 1 ? 0 : 1]}`) : null),
      change.op === "changed" ? el("dl", { class: "change__facets" }, Object.keys(change.now).map((facet) => el("div", { class: "facet" },
        el("dt", { class: "facet__name" }, FACET_NAMES[facet] ?? facet),
        el("dd", { class: "facet__was" }, facetValue(model, change, facet, change.was[facet])),
        el("dd", { class: "facet__arrow", "aria-label": "became" }, "→"),
        el("dd", { class: "facet__now" }, facetValue(model, change, facet, change.now[facet]))))) : null));
}

/** The changes of an entry by kind. */
function changesNode(model, entry) {
  const groups = CHANGE_KINDS.map((kind) => [kind, entry.changes.filter((change) => change.kind === kind)]).filter(([, changes]) => changes.length);
  return groups.length
    ? el("div", { class: "sections" }, groups.map(([kind, changes]) => el("details", { class: "section", open: changes.length <= 25 },
      el("summary", { class: "section__head" }, el("span", { class: "section__title" }, KIND_TITLES[kind]), count(changes.length)),
      el("ul", { class: "section__body changes" }, changes.map((change) => changeRow(model, change))))))
    : el("p", { class: "block__note" }, "No API changes between these builds.");
}

/**
 * An entry of the changelog as the index lists it: the builds it compares, the counts and the notes at once, the
 * changes when it is opened (its file is fetched then, not with the page).
 */
function entryNode(model, summary, open) {
  const id = buildId(summary.build);
  const log = changelogOf(model);
  const status = el("p", { class: "block__note" }, "Loading…");
  const details = el("details", { class: "entry", id: `b-${id}`, open },
    el("summary", { class: "entry__head" },
      el("span", { class: "entry__build" }, "Build ", code(id)),
      el("span", { class: "entry__date" }, versionDate(summary.build.versionDate)),
      el("span", { class: "entry__from" }, "from ", code(buildId(summary.from))),
      deltas(summary.counts)),
    el("div", { class: "entry__body" },
      (summary.notes ?? []).map((note) => el("div", { class: "callout callout--warn", role: "note" }, icon("warning"), el("p", {}, note))),
      status));
  let requested = false;
  const fillBody = () => {
    if (requested) return;
    requested = true;
    loadEntry(log, summary).then((entry) => status.replaceWith(changesNode(model, entry))).catch(() => {
      requested = false;   // closing and opening the entry tries again
      status.textContent = "Could not load the changes of this build.";
    });
  };
  if (open) fillBody();
  details.addEventListener("toggle", () => details.open && fillBody());
  return details;
}

/**
 * Everything the changelog says about a page and what is under it (a class and its methods): by build, newest first.
 * Only the entries that touch the page are fetched; the block is there at once and fills when they arrive.
 */
function historyBlock(model, route) {
  const log = changelogOf(model);
  const summaries = (log?.entries ?? []).filter((summary) => summary.pages.includes(route));
  if (!summaries.length) return null;
  const list = el("div", { class: "history" }, el("p", { class: "block__note" }, "Loading…"));
  Promise.all(summaries.map((summary) => loadEntry(log, summary))).then((entries) => fill(list, entries.map((entry) => el("section", { class: "history__entry" },
    el("h3", { class: "history__build" }, el("a", { href: `#/${model.id}/changelog/${buildId(entry.build)}` }, "Build ", code(buildId(entry.build))),
      el("span", { class: "muted" }, ` · ${versionDate(entry.build.versionDate)}`)),
    el("ul", { class: "changes" }, entry.changes
      .filter((change) => change.route === route || change.route.startsWith(`${route}/`))
      .map((change) => changeRow(model, change))))))).catch(() => fill(list, el("p", { class: "block__note" }, "Could not load the history.")));
  return block("History", summaries.length, list);
}

/** Overview block: the newest entry in a line, a link to it. */
function latestChanges(model) {
  const log = changelogOf(model);
  if (!log) return null;
  const [entry] = log.entries;
  return block("What changed", null, entry
    ? el("a", { class: "digest", href: `#/${model.id}/changelog/${buildId(entry.build)}` },
      el("span", { class: "digest__main" },
        el("span", { class: "digest__title" }, "Build ", code(buildId(entry.build)), ` · ${versionDate(entry.build.versionDate)}`),
        el("span", { class: "digest__text" }, "against build ", code(buildId(entry.from)))),
      deltas(entry.counts), icon("arrow"))
    : el("p", { class: "block__note" }, "Nothing to compare with yet: ", log.first ? ["the changelog starts at build ", code(buildId(log.first)), "."] : "there is one dump."));
}

// ---------------------------------------------------------------------------------------------------------
// Pages

function pageHome() {
  document.title = SITE_TITLE;
  const repo = manifest.repository;
  const card = (attrs, kind, title, desc, stats, foot, footIcon) =>
    el("a", attrs, el("span", { class: "dcard__kind" }, kind), el("span", { class: "dcard__title" }, title),
      el("span", { class: "dcard__desc" }, desc), stats, el("span", { class: "dcard__foot" }, foot, icon(footIcon)));
  const builds = manifest.datasets.find((dataset) => dataset.summary)?.summary.builds;
  show(
    el("header", { class: "hero" },
      el("h1", { class: "hero__title" }, SITE_TITLE),
      el("p", { class: "lead" }, "Data for Dota 2 custom game development, taken from the game itself.")),
    block("Datasets", null, el("div", { class: "cards" }, manifest.datasets.map((dataset) => {
      const { summary } = dataset;
      const stats = summary && el("span", { class: "dcard__stats" },
        [["classes", summary.classes], ["functions", summary.functions], ["enums", summary.enums], ["constants", summary.constants],
          ["entity classes", summary.entities]]
          .filter(([, value]) => value !== undefined).map(([label, value]) => el("span", {}, el("b", {}, value), ` ${label}`)));
      const change = summary?.lastChange && el("span", { class: "dcard__change" }, deltas(summary.lastChange), " since build ", code(summary.lastChange.from));
      return card({ class: "dcard", href: `#/${dataset.id}` }, capitalize(Object.keys(dataset.files).join(" + ")), dataset.title,
        dataset.description, [stats, change], summary ? buildLine(summary.builds) : "Open", "arrow");
    }))),
    block("Use it in your editor", null, el("div", { class: "cards" },
      card({ class: "dcard dcard--quiet", href: `${repo}/tree/main/extension` }, "VS Code extension", "Dota 2 VScripts Annotations",
        "Dota 2 VScripts Lua API definitions for EmmyLua, taken from the game itself.", null, "Needs EmmyLua", "external"),
      card({ class: "dcard dcard--quiet", href: repo }, "Repository", repo.split("/").pop(),
        "Raw JSON dumps, EmmyLua annotations and the source of this site.", null, "MIT license", "external"))),
    footer(builds),
  );
}

/** Banner telling whether the data comes from the current Steam build of the game; filled when Steam answers. */
function freshnessStatus(model) {
  const dumped = buildIds(model.builds);
  const dumpedBuild = [`build${dumped.length > 1 ? "s" : ""} `, codes(dumped)];
  const box = el("div", { role: "status" });
  const render = (state, iconName, title, text, steam, differs = false) => {
    box.className = `status status--${state}`;
    fill(box,
      el("span", { class: "status__icon" }, icon(iconName, "lg")),
      el("div", { class: "status__body" }, el("p", { class: "status__title" }, title), el("p", { class: "status__text" }, text)),
      el("dl", { class: "status__builds" },
        el("div", {}, el("dt", {}, "Dump"), el("dd", {}, dumped.join(", "))),
        el("div", {}, el("dt", {}, "Steam"), el("dd", { class: differs ? "is-diff" : null }, steam))));
  };
  render("checking", "spinner", "Checking against Steam…", "Asking Steam for the public build of Dota 2.", "…");
  currentSteamBuild().then((current) => {
    if (!current) {
      render("error", "question", "Could not reach Steam",
        ["The data is from ", dumpedBuild, "; whether it is the latest is unknown."], "—");
    } else if (dumped.length === 1 && dumped[0] === current.id) {
      render("ok", "check", "Matches the current build",
        ["Dumped from build ", code(current.id), `, the public Dota 2 build on Steam since ${steamDate(current.time)}.`], current.id);
    } else if (dumped.every((id) => isNewerBuild(id, current.id))) {
      render("ahead", "check", "Newer than Steam's info",
        ["The data is from ", dumpedBuild, "; the Steam info service reports build ", code(current.id), ` since ${steamDate(current.time)}. `,
          "Its data lags behind the game."], current.id);
    } else {
      render("stale", "warning", "A newer build is out",
        ["Steam serves build ", code(current.id), ` since ${steamDate(current.time)}; the data is from `, dumpedBuild,
          ". A new dump is pending."], current.id, true);
    }
  });
  return box;
}

/** .emmyrc.json snippet with a Copy button. */
function emmyrcBlock(library) {
  const p = (text) => el("span", { class: "tok-p" }, text);
  const key = (text) => el("span", { class: "tok-key" }, `"${text}"`);
  const pre = el("pre", { tabindex: "0" }, el("code", {},
    p("{"), "\n  ", key("workspace"), p(": {"), "\n    ", key("library"), p(": ["),
    el("span", { class: "tok-str" }, `"<path to the repository>/${library}"`), p("]"), "\n  ", p("}"), "\n", p("}")));
  const label = document.createTextNode("Copy");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent);
      label.textContent = "Copied";
      setTimeout(() => (label.textContent = "Copy"), 1400);
    } catch {
      // Clipboard blocked: the text stays selectable.
    }
  };
  return el("figure", { class: "codeblock" },
    el("figcaption", { class: "codeblock__head" }, el("span", { class: "codeblock__name" }, ".emmyrc.json"),
      el("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: copy }, icon("copy", "sm"), label)),
    pre);
}

function pageOverview(model) {
  const { dataset } = model;
  const repo = manifest.repository;
  const stat = (value, label, route) => el("li", {}, route
    ? el("a", { class: "stat", href: `#/${model.id}/${route}` }, el("span", { class: "stat__num" }, value), el("span", { class: "stat__label" }, label))
    : el("div", { class: "stat" }, el("span", { class: "stat__num" }, value), el("span", { class: "stat__label" }, label)));
  const download = (iconName, title, text, links) => el("div", { class: "dl" },
    el("span", { class: "dl__icon" }, icon(iconName)),
    el("div", {}, el("p", { class: "dl__title" }, title), el("p", { class: "dl__text" }, text)),
    el("div", { class: "dl__links" }, links));
  const button = (href, iconName, text) => el("a", { class: "btn btn--sm", href }, icon(iconName, "sm"), text);
  show(
    pageHead({ eyebrow: "Dataset", title: dataset.title, sans: true, lead: dataset.description }),
    freshnessStatus(model),
    latestChanges(model),
    block("Game build", null, table("build",
      [["Side"], ["Steam build", "num"], ["Version", "num"], ["Revision", "num"], ["Date"]],
      model.sides.map((side) => {
        const build = model.builds[side];
        return el("tr", {},
          el("td", {}, sideTag(side, `${capitalize(side)} VM`)),
          el("td", { class: "num", "data-label": "Steam build" }, code(build.steamBuildId ?? "—")),
          el("td", { class: "num", "data-label": "Version" }, code(build.clientVersion)),
          el("td", { class: "num", "data-label": "Revision" }, code(build.sourceRevision)),
          el("td", { "data-label": "Date" }, versionDate(build.versionDate)));
      }))),
    block("Contents", null, el("ul", { class: "stats" },
      stat(model.classes.size, "classes"),
      stat(model.functions.size, "functions", "functions"),
      stat(model.instances.size, "instances", "instances"),
      stat(model.enums.size, "enums"),
      stat(model.constants.size, "constants", "constants"),
      stat(model.lua.size, "core Lua"),
      model.entities.size ? stat(model.entities.size, "entity classes", "entities") : null)),
    block("Sides", null, el("ul", { class: "legend" },
      model.sides.map((side) => el("li", {}, sideTag(side), el("span", {}, `Exists on the ${side} VM only.`))),
      el("li", {}, el("span", { class: "legend__none" }, "no mark"), el("span", {}, "Exists on both sides.")))),
    block("Download", null,
      el("div", { class: "downloads" },
        download("download", "Raw dumps",
          ["JSON, keys sorted. Format — ", el("a", { href: `${repo}/tree/main/data/${model.id}` }, "described in the repository"), "."],
          [...Object.entries(dataset.files).map(([side, path]) => button(dataRoot + path, "file", `${side}.json`)),
            dataset.entities ? button(dataRoot + dataset.entities, "file", dataset.entities.split("/").pop()) : null]),
        download("braces", "EmmyLua annotations", ["LuaCATS definitions: ", code("shared/"), ", ", code("server/"), ", ", code("client/"), "."],
          button(`${repo}/tree/main/${dataset.annotations}`, "external", dataset.annotations)),
        download("extension", "VS Code extension", "Dota 2 VScripts Annotations connects the same annotations to EmmyLua for you.",
          button(`${repo}/tree/main/extension`, "external", "Extension"))),
      el("p", { class: "block__note downloads__note" }, "Without the extension, add the annotations as a library in the project’s ",
        code(".emmyrc.json"), ":"),
      emmyrcBlock(dataset.annotations)),
    footer(model.builds),
  );
}

/** Inheritance chain of a class: one per side when the bases differ between sides. */
function inheritanceChains(model, cls) {
  const chains = model.sides.filter((side) => cls.sides.has(side))
    .map((side) => ({ side, chain: model.chain(cls.name, side) }))
    .filter(({ chain }) => chain.length > 1);
  if (!chains.length) return null;
  const same = chains.every(({ chain }) => chain.join() === chains[0].chain.join());
  return (same ? chains.slice(0, 1) : chains).map(({ side, chain }) =>
    el("nav", { class: "chain", "aria-label": same ? "Inheritance" : `Inheritance on the ${side}` },
      el("span", { class: "chain__label" }, "Inheritance", same ? null : sideTag(side)),
      el("ol", {}, chain.map((name, i) => (i === chain.length - 1
        ? el("li", { "aria-current": "page" }, breaks(name))
        : el("li", {}, model.classes.has(name) ? el("a", { href: `#/${model.id}/class/${name}` }, breaks(name)) : breaks(name)))))));
}

function pageClass(model, name, member) {
  const cls = model.classes.get(name);
  if (!cls) return pageNotFound(model, "class", name);
  const own = [...cls.members.values()].sort((a, b) => a.name.localeCompare(b.name));
  const inherited = model.inherited(cls);
  const inheritedCount = inherited.reduce((sum, group) => sum + group.members.length, 0);
  const method = (m, owner, id) => memberBlock(model, {
    id, name: m.name, href: `${model.id}/class/${owner}/${m.name}`, route: `class/${owner}/${m.name}`,
    parts: signatureParts(m.kind, m.fn, { method: true }), sides: m.sides, context: cls.sides, fn: m.fn, here: cls.name,
  });
  const sections = inherited.map(({ ancestor, members }) => el("details", { class: "section" },
    el("summary", { class: "section__head" },
      el("span", { class: "section__title" }, "Inherited from ", code(breaks(ancestor))), count(members.length)),
    el("div", { class: "section__body members members--compact" }, members.map((m) => method(m, ancestor, null)))));
  const empty = el("p", { class: "empty__hint", hidden: true }, "No methods match the filter.");
  const page = [
    pageHead({
      eyebrow: "Class", title: cls.name, tags: [sideTags(model, cls.sides), changeMark(model, `class/${cls.name}`)],
      facts: [
        ["Methods", inheritedCount ? `${own.length} own · ${inheritedCount} inherited` : `${own.length} own`],
        cls.instances.length ? [cls.instances.length > 1 ? "Instances" : "Instance", cls.instances.map((instance, i) => [i ? ", " : "", code(instance)])] : null,
      ],
      more: [
        inheritanceChains(model, cls),
        cls.derived.length ? el("details", { class: "section section--plain" },
          el("summary", { class: "section__head" }, el("span", { class: "section__title" }, "Derived classes"), count(cls.derived.length)),
          el("ul", { class: "section__body column" }, cls.derived.map((derived) =>
            el("li", {}, el("a", { href: `#/${model.id}/class/${derived}`, title: derived }, derived))))) : null,
      ],
    }),
    own.length + inheritedCount ? memberToolbar(model, {
      id: "member-filter", label: "Filter methods", members: [...own, ...inherited.flatMap((group) => group.members)], empty,
    },
    sections.length ? [
      el("span", { class: "toolbar__spacer" }),
      el("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => sections.forEach((s) => (s.open = true)) }, "Expand inherited"),
      el("button", { class: "btn btn--ghost btn--sm", type: "button", onclick: () => sections.forEach((s) => (s.open = false)) }, "Collapse"),
    ] : null) : null,
    block("Methods", own.length, own.length
      ? el("div", { class: "members" }, own.map((m) => method(m, cls.name, m.name)))
      : el("p", { class: "block__note" }, "No own methods.")),
    sections.length ? block("Inherited", inheritedCount, el("div", { class: "sections" }, sections)) : null,
    historyBlock(model, `class/${cls.name}`),
    empty,
  ];
  show(page);
  // An own member of the route, else an inherited one: it has no id here, so find it by name.
  if (member && !focusMember(member)) {
    const node = [...view.querySelectorAll(".member[data-name]")].find((m) => m.dataset.name === member);
    if (node) {
      node.id = `m-${member}`;
      focusMember(member);
    }
  }
}

// Value type fields: coordinates, then colour channels, then the rest by name.
const FIELD_ORDER = "xyzwrgba";
const fieldRank = (field) => (field.length === 1 && FIELD_ORDER.includes(field) ? FIELD_ORDER.indexOf(field) : FIELD_ORDER.length);

// Lua metamethods by event name: symbol and what it does.
const OPERATORS = {
  add: ["+", "add"], sub: ["-", "subtract"], mul: ["*", "multiply"], div: ["/", "divide"], mod: ["%", "modulo"],
  pow: ["^", "power"], unm: ["-", "negate"], len: ["#", "length"], concat: ["..", "concatenate"],
  eq: ["==", "equal"], lt: ["<", "less than"], le: ["<=", "less or equal"],
};

function pageValueType(model, name, member) {
  const type = model.valueTypes.get(name);
  if (!type) return pageNotFound(model, "value type", name);
  const { probe } = type.value;
  const operand = (kind) => (kind === "self" ? name : "number");
  const fields = Object.entries(probe?.fields ?? {}).sort(([a], [b]) => fieldRank(a) - fieldRank(b) || a.localeCompare(b));
  const operators = new Map();
  for (const op of probe?.operators ?? []) {
    if (!operators.has(op.op)) operators.set(op.op, []);
    operators.get(op.op).push(op);
  }
  const methods = model.typeMethods(type);
  const typed = (kind) => typeNode(model, operand(kind), name);
  show(
    pageHead({
      eyebrow: "Value type", title: name, tags: [sideTags(model, type.sides), changeMark(model, `type/${name}`)],
      more: probe ? el("div", { class: "callout", role: "note" }, icon("info"),
        el("p", {}, "Fields, operators and signatures were found by trying a sample made by ", code(`${name}()`),
          "; parameter names are unknown.")) : null,
    }),
    fields.length ? block("Fields", fields.length, table("fields", [["Field"], ["Type"]],
      fields.map(([field, kind]) => el("tr", {}, el("td", {}, code(field)), el("td", {}, typeNode(model, kind, name)))))) : null,
    operators.size ? block("Operators", probe.operators.length, table("ops", [["Operator"], ["Forms"], ["Result"]],
      [...operators].map(([op, forms]) => {
        const [symbol, label] = OPERATORS[op] ?? [op, op];
        const results = [...new Set(forms.map((form) => form.result))];
        return el("tr", {},
          el("td", {}, el("code", { class: "op-sym" }, symbol), " ", el("span", { class: "muted" }, label)),
          el("td", {}, el("div", { class: "forms" }, forms.map((form) => (form.left === undefined
            ? el("code", {}, symbol, typed("self"))
            : el("code", {}, typed(form.left), ` ${symbol} `, typed(form.right)))))),
          el("td", {}, results.map((result, i) => [i ? " " : "", el("code", {}, typeNode(model, result, name))])));
      }))) : null,
    block("Methods", methods.length, el("div", { class: "members" }, methods.map((method) => {
      const probed = probe?.methods?.[method];
      return memberBlock(model, {
        id: method, name: method, href: `${model.id}/type/${name}/${method}`, route: `type/${name}/${method}`,
        parts: signatureParts(probed ? "probe" : "unknown", probed, { owner: name }),
        sides: type.sides, context: type.sides, here: name,
      });
    }))),
    historyBlock(model, `type/${name}`),
  );
  focusMember(member);
}

function pageFunctions(model, name) {
  if (name && !model.functions.has(name)) return pageNotFound(model, "function", name);
  const all = [...model.functions.values()].sort((a, b) => a.name.localeCompare(b.name));
  const empty = el("p", { class: "empty__hint", hidden: true }, "No functions match the filter.");
  show(
    pageHead({ title: "Global functions", sans: true, lead: "Functions the engine puts in the global scope of the Lua VM." }),
    memberToolbar(model, {
      id: "function-filter", label: "Filter functions", members: all, empty,
    }),
    block("Functions", all.length, el("div", { class: "members" }, all.map((fn) => memberBlock(model, {
      id: fn.name, name: fn.name, href: `${model.id}/function/${fn.name}`, route: `function/${fn.name}`,
      parts: signatureParts("bound", fn.value), sides: fn.sides, fn: fn.value,
    })))),
    empty,
  );
  focusMember(name);
}

function pageInstances(model, name) {
  const all = [...model.instances.values()].sort((a, b) => a.name.localeCompare(b.name));
  show(
    pageHead({ title: "Instances", sans: true, lead: "Objects the engine puts in the global scope, with their classes." }),
    table("instances", [["Name"], ["Class"], ["Side", "side-col"]], all.map((instance) => el("tr", { id: `m-${instance.name}` },
      el("td", {}, code(instance.name), changeMark(model, `instances/${instance.name}`)),
      el("td", {}, el("code", {}, typeNode(model, instance.value))),
      el("td", { class: "side-col" }, sideTags(model, instance.sides))))),
  );
  focusMember(name);
}

/** Common prefix of enum value names up to its last "_": DOTA_GAMERULES_STATE_ of DOTA_GAMERULES_STATE_INIT… */
function commonPrefix(names) {
  if (names.length < 2) return "";
  let prefix = names[0];
  for (const name of names) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  prefix = prefix.slice(0, prefix.lastIndexOf("_") + 1);
  return names.some((name) => name === prefix) ? "" : prefix;
}

function pageEnum(model, name, member) {
  const enumeration = model.enums.get(name);
  if (!enumeration) return pageNotFound(model, "enum", name);
  const values = Object.entries(enumeration.value).sort((a, b) => (a[1].value ?? 0) - (b[1].value ?? 0));
  const prefix = commonPrefix(values.map(([value]) => value));
  const described = values.some(([, info]) => info.desc);
  show(
    pageHead({
      eyebrow: "Enum", title: name, tags: [sideTags(model, enumeration.sides), changeMark(model, `enum/${name}`)],
      facts: [["Values", values.length], ["Order", "by value"]],
    }),
    table("enum", [["Name"], ["Value", "num"], described ? ["Description"] : null].filter(Boolean),
      values.map(([value, info]) => el("tr", { id: `m-${value}` },
        el("td", {}, el("code", { class: "ident" },
          prefix ? el("span", { class: "ident__prefix" }, breaks(prefix)) : null, breaks(value.slice(prefix.length))),
        changeMark(model, `enum/${name}/${value}`)),
        el("td", { class: "num" }, code(info.value ?? "—")),
        described ? el("td", { class: "desc" }, info.desc) : null))),
    described ? null : el("p", { class: "table-caption" }, "The engine gives no descriptions for these values."),
    historyBlock(model, `enum/${name}`),
  );
  focusMember(member);
}

function pageGlobal(model, name, member) {
  const global = model.lua.get(name);
  if (!global) return pageNotFound(model, "global", name);
  if (global.value.type === "function") {
    show(
      pageHead({ eyebrow: "Lua function", title: name, tags: [sideTags(model, global.sides), changeMark(model, `global/${name}`)] }),
      el("div", { class: "members" }, memberBlock(model, {
        id: name, name, parts: signatureParts("plain", global.value.fn), sides: global.sides, context: global.sides, fn: global.value.fn,
      })),
      historyBlock(model, `global/${name}`),
    );
    return;
  }
  const members = Object.entries(global.value.members ?? {}).sort((a, b) => a[0].localeCompare(b[0]));
  show(
    pageHead({
      eyebrow: "Lua table", title: name, tags: [sideTags(model, global.sides), changeMark(model, `global/${name}`)], facts: [["Members", members.length]],
    }),
    block("Members", members.length, el("div", { class: "members" }, members.map(([key, info]) => (info.type === "function"
      ? memberBlock(model, {
        id: key, name: key, href: `${model.id}/global/${name}/${key}`, route: `global/${name}/${key}`,
        parts: signatureParts("plain", info.fn), sides: global.sides, context: global.sides, fn: info.fn,
      })
      : el("article", { class: "member", id: `m-${key}`, "data-name": key },
        el("div", { class: "member__head" }, el("code", { class: "sig" },
          el("span", { class: "sig__name" }, key), el("span", { class: "sig__p" }, ": "), el("span", { class: "sig__type" }, info.type)))))))),
  );
  focusMember(member);
}

function pageConstants(model, name) {
  const all = [...model.constants.values()].sort((a, b) => a.name.localeCompare(b.name));
  // Every row is built once; the filter only hides rows, so typing stays instant.
  const rows = all.map((constant) => {
    const { value } = constant.value;
    return el("tr", { id: `m-${constant.name}`, "data-name": constant.name.toLowerCase() },
      el("td", {}, el("code", { class: "ident" }, breaks(constant.name)), changeMark(model, `constants/${constant.name}`)),
      el("td", { class: typeof value === "string" ? "str" : typeof value === "number" ? "num" : null }, code(JSON.stringify(value))),
      el("td", { class: "side-col" }, sideTags(model, constant.sides)));
  });
  const meta = el("p", { class: "filter__meta" });
  const table = el("div", { class: "table-wrap" }, el("table", { class: "table table--const" },
    el("thead", {}, el("tr", {}, el("th", { scope: "col" }, "Name"), el("th", { scope: "col" }, "Value"), el("th", { scope: "col", class: "side-col" }, "Side"))),
    el("tbody", {}, rows)));
  const empty = el("p", { class: "empty__hint", hidden: true }, "No constants match the filter.");
  // Nothing matches: the message takes the place of the table, not a header row over nothing.
  const filter = (words) => {
    let shown = 0;
    for (const row of rows) {
      row.hidden = !matchesWords(row.dataset.name, words);
      if (!row.hidden) shown++;
    }
    fill(meta, el("strong", {}, shown), ` of ${all.length}`);
    table.hidden = shown === 0;
    empty.hidden = shown > 0;
  };
  const toolbar = filterToolbar("const-filter", "Filter constants by name", "Filter by name", filter, meta);
  const input = toolbar.querySelector(".filter__input");
  input.value = name ?? "";
  show(
    pageHead({ title: "Constants", sans: true, lead: ["Numbers and strings in ", code("_G"), " outside enums."] }),
    toolbar,
    table,
    empty,
  );
  filter(queryWords(input.value));
  focusMember(name);
}

// Kind switch of the entity classes page: the kinds of ENTITY_KINDS and the rest, in reading order.
const baseOf = (kind) => ENTITY_KINDS.find(([entry]) => entry === kind)[1];
const ENTITY_KIND_OPTIONS = [
  ["all", "all"],
  ["hero", "heroes", `Derive from ${baseOf("hero")}`],
  ["unit", "units", `Derive from ${baseOf("unit")}, heroes aside`],
  ["item", "items", `Derive from ${baseOf("item")}`],
  ["ability", "abilities", `Derive from ${baseOf("ability")}, items aside`],
  ["other", "other", "Neither units, items nor abilities: info_target, logic_*, triggers, props…"],
];

function pageEntities(model, name) {
  const all = [...model.entities.values()];
  const route = (entity) => `#/${model.id}/entities/${entity}`;
  const rows = all.map((entity) => el("tr", {
    id: `m-${entity.name}`, "data-name": `${entity.name} ${entity.cls}`.toLowerCase(), "data-kind": entity.kind,
  },
  el("td", { class: "row-num" }),
  el("td", {}, el("code", { class: "ident" }, breaks(entity.name)), changeMark(model, `entities/${entity.name}`),
    entity.aliasOf ? el("span", { class: "entity-alias" }, "alias of ", el("a", { href: route(entity.aliasOf) }, code(entity.aliasOf))) : null),
  el("td", { "data-label": "Lua class" }, entity.luaClass
    ? el("code", { class: "ident" }, typeNode(model, entity.luaClass))
    : el("span", { class: "empty-cell" }, "—")),
  el("td", { "data-label": "C++ class" }, el("code", { class: "ident" }, breaks(entity.cls)))));
  const meta = el("p", { class: "filter__meta" });
  const table = el("div", { class: "table-wrap" }, el("table", { class: "table table--entities" },
    el("thead", {}, el("tr", {}, el("th", { scope: "col", class: "row-num" }, "#"), el("th", { scope: "col" }, "Name"),
      el("th", { scope: "col" }, "Lua class"), el("th", { scope: "col" }, "C++ class"))),
    el("tbody", {}, rows)));
  const empty = el("p", { class: "empty__hint", hidden: true }, "No entity classes match the filter.");
  const state = { words: [], kind: "all" };
  // Every row is built once; the filters only hide rows and number the ones shown, so typing stays instant.
  const filter = () => {
    let shown = 0;
    for (const row of rows) {
      row.hidden = !matchesWords(row.dataset.name, state.words) || (state.kind !== "all" && row.dataset.kind !== state.kind);
      if (!row.hidden) row.cells[0].textContent = ++shown;
    }
    fill(meta, el("strong", {}, shown), ` of ${all.length}`);
    table.hidden = shown === 0;
    empty.hidden = shown > 0;
  };
  const toolbar = filterToolbar("entity-filter", "Filter entity classes", "Filter by name or class",
    (words) => { state.words = words; filter(); }, meta);
  toolbar.prepend(segmented("entity-kind", "Kind", ENTITY_KIND_OPTIONS, (kind) => { state.kind = kind; filter(); }));
  const input = toolbar.querySelector(".filter__input");
  input.value = name ?? "";
  state.words = queryWords(input.value);
  show(
    pageHead({
      title: "Entity classes", sans: true,
      lead: ["Names that ", code("SpawnEntityFromTableSynchronous"), ", ", code("CEntities:CreateByClassname"), " and ",
        code("FindAllByClassname"), " take, the Lua class of the handle each gives — the nearest of its C++ classes the Lua API describes — and the C++ class it creates."],
    }),
    el("div", { class: "callout", role: "note" }, icon("info"),
      el("p", {}, "Read from ", code("server.dll"), ", not from the Lua VM. Items, abilities and heroes are entities too, but are made with ",
        code("CreateItem"), ", ", code("AddAbility"), " and ", code("CreateUnitByName"), ".")),
    toolbar,
    table,
    empty,
  );
  filter();
  focusMember(name);
}

function pageChangelog(model, build) {
  const log = changelogOf(model);
  if (!log) return pageNotFound(model, "page", "changelog");
  if (build && !log.entries.some((entry) => buildId(entry.build) === build)) return pageNotFound(model, "build", build);
  const opened = build ?? (log.entries[0] && buildId(log.entries[0].build));
  show(
    pageHead({
      title: "Changelog", sans: true, lead: "What changed in the API between the dumped game builds.",
      facts: [
        log.first ? ["Tracked since", ["Build ", code(buildId(log.first)), ` · ${versionDate(log.first.versionDate)}`]] : null,
        ["Entries", log.entries.length],
      ],
    }),
    el("div", { class: "callout", role: "note" }, icon("info"),
      el("p", {}, "Each entry compares the dumps of two builds. A build nobody dumped has no entry of its own: what it changed is in the entry of the next dumped one. ",
        "Only what the engine reports to the script VM is compared.")),
    log.entries.length
      ? el("div", { class: "entries" }, log.entries.map((entry) => entryNode(model, entry, buildId(entry.build) === opened)))
      : el("p", { class: "block__note" }, "Nothing to compare with yet: the changelog compares two dumps, and there is one."),
  );
  if (build) document.getElementById(`b-${build}`)?.scrollIntoView({ block: "start" });
}

/** Empty, error and not-found states; `failed` paints it as an error, `details` is the error text. */
function emptyState({ iconName, title, text, hint, actions, failed = false, details }) {
  document.title = `${title} — ${SITE_TITLE}`;
  return el("div", { class: failed ? "empty empty--error" : "empty" },
    el("span", { class: "empty__icon" }, icon(iconName, "lg")),
    el("h1", { class: "empty__title" }, title),
    text ? el("p", { class: "empty__text" }, text) : null,
    hint ? el("p", { class: "empty__hint" }, hint) : null,
    details ? el("pre", {}, details) : null,
    actions ? el("div", { class: "empty__actions" }, actions) : null);
}

function pageNotFound(model, kind, name) {
  show(emptyState({
    iconName: "missing", title: "Not found",
    text: name ? ["There is no ", kind, " ", code(name), " in ", model?.dataset.title ?? SITE_TITLE, "."] : `There is no such ${kind}.`,
    actions: el("a", { class: "btn", href: model ? `#/${model.id}` : "#/" }, icon("overview", "sm"), model ? "Overview" : "Home"),
  }));
}

function pageLoading(dataset) {
  document.title = SITE_TITLE;
  const skeleton = (width, style = "") => el("div", { class: "skel", style: `width: ${width}%${style}` });
  show(el("div", { class: "loading", "aria-busy": "true" },
    el("p", { class: "loading__label", role: "status" }, icon("spinner"), `Loading ${dataset.title}…`),
    el("div", { class: "skel skel--title" }), skeleton(64), skeleton(48), skeleton(72, "; margin-top: 24px"), skeleton(56)));
}

function showError(error) {
  show(emptyState({
    iconName: "error", title: "Could not load the data", failed: true, details: String(error?.stack ?? error),
    text: "The page needs the dump files next to the site. Reload, or open the repository if it keeps failing.",
    actions: [
      el("button", { class: "btn", type: "button", onclick: () => location.reload() }, "Reload"),
      manifest ? el("a", { class: "btn btn--ghost", href: manifest.repository }, icon("external", "sm"), "Repository") : null,
    ],
  }));
}

// ---------------------------------------------------------------------------------------------------------
// Search: results take the main area; the page of the route comes back when the query is cleared.

let searchKind = null;
let activeHit = 0;
let searchTimer = null;

/** Model to search: the dataset in the route, else the first VScripts one. */
async function searchModel() {
  if (currentModel) return currentModel;
  const dataset = manifest.datasets.find((d) => d.kind === "vscripts-api");
  return dataset ? loadModel(dataset) : null;
}

/** Text with the parts matching the query words wrapped in <mark>, built as nodes. */
function highlight(text, words) {
  const lower = text.toLowerCase();
  const spans = [];
  for (const word of words) for (let i = lower.indexOf(word); i >= 0; i = lower.indexOf(word, i + word.length)) spans.push([i, i + word.length]);
  spans.sort((a, b) => a[0] - b[0]);
  const nodes = [];
  let pos = 0;
  for (const [start, end] of spans) {
    if (end <= pos) continue;
    const from = Math.max(start, pos);
    nodes.push(text.slice(pos, from), el("mark", {}, text.slice(from, end)));
    pos = end;
  }
  nodes.push(text.slice(pos));
  return nodes.filter((node) => node !== "");
}

function hitNode(model, entry, words, active) {
  const member = entry.owner && entry.label.slice(entry.owner.length + 1);
  const desc = entry.sig === "bound" ? entry.fn.desc?.split(/\b(?:Args|Params):/)[0].trim() : null;
  // An instance leads to its class, so the changes of the class are not its own.
  const mark = entry.kind === "instance" ? null : changeMark(model, entry.route, { link: false });
  return el("li", { class: "hit" }, el("a", { class: active ? "hit__link is-active" : "hit__link", href: `#/${model.id}/${entry.route}` },
    el("span", { class: "hit__kind" }, entry.kind),
    el("span", { class: "hit__main" },
      el("span", { class: "hit__name" }, member
        ? [el("span", { class: "hit__owner" }, highlight(entry.owner, words), ":"), highlight(member, words)]
        : highlight(entry.label, words), mark),
      entry.sig ? signature(model, null, signatureParts(entry.sig, entry.fn, { method: Boolean(entry.owner), owner: entry.owner }), { extraClass: " hit__sig" }) : null,
      desc ? el("span", { class: "hit__desc" }, desc) : null),
    el("span", { class: "hit__enter" }, icon("enter", "sm"), "Enter")));
}

async function renderSearch() {
  const query = search.value.trim();
  const model = await searchModel();
  if (!model || search.value.trim() !== query) return; // the query changed while the data loaded
  const words = queryWords(query);
  const all = model.search(query);
  document.title = `${query} — ${SITE_TITLE}`;
  if (!all.length) {
    show(emptyState({
      iconName: "search", title: "Nothing found",
      text: ["No name contains ", words.map((word, i) => [i ? " and " : "", code(word)]), "."],
      hint: ["Words can go in any order and match parts of names: ", code("spawn table"), " finds ", code("SpawnEntityFromTableAsynchronous"), "."],
    }));
    return;
  }
  const kinds = new Map();
  for (const entry of all) kinds.set(entry.kind, (kinds.get(entry.kind) ?? 0) + 1);
  if (searchKind && !kinds.has(searchKind)) searchKind = null;
  const hits = searchKind ? all.filter((entry) => entry.kind === searchKind) : all;
  activeHit = Math.min(activeHit, hits.length - 1);
  const chip = (kind, total, label) => el("button", {
    class: "chip", type: "button", "aria-pressed": String((searchKind ?? "") === kind),
    onclick: () => {
      searchKind = kind || null;
      activeHit = 0;
      renderSearch();
    },
  }, label, " ", count(total));
  show(
    el("div", { class: "results__head" },
      el("h1", { class: "results__title" }, `${all.length === SEARCH_LIMIT ? `${SEARCH_LIMIT}+` : all.length} result${all.length === 1 ? "" : "s"} for `,
        el("q", {}, query)),
      el("div", { class: "chips", role: "group", "aria-label": "Filter results by kind" },
        chip("", all.length, "All"), [...kinds].map(([kind, total]) => chip(kind, total, kind)))),
    el("ol", { class: "hits" }, hits.map((entry, i) => hitNode(model, entry, words, i === activeHit))),
    el("p", { class: "keys" },
      el("span", {}, el("kbd", {}, "↑"), el("kbd", {}, "↓"), "move"),
      el("span", {}, el("kbd", {}, "Enter"), "open"),
      el("span", {}, el("kbd", {}, "Esc"), "clear and go back")),
  );
}

function moveActiveHit(delta) {
  const links = [...view.querySelectorAll(".hit__link")];
  if (!links.length) return;
  links[activeHit]?.classList.remove("is-active");
  activeHit = (activeHit + delta + links.length) % links.length;
  links[activeHit].classList.add("is-active");
  links[activeHit].scrollIntoView({ block: "nearest" });
}

/** The "/" hint turns into a clear button while there is a query. */
function syncSearchBox() {
  const box = search.closest(".search");
  box.querySelector(".search__key").hidden = Boolean(search.value);
  box.querySelector(".search__clear").hidden = !search.value;
}

/** Empties the query; the page of the route comes back unless a navigation is about to render one. */
function clearSearch({ restore = true } = {}) {
  clearTimeout(searchTimer);
  const had = Boolean(search.value);
  search.value = "";
  searchKind = null;
  activeHit = 0;
  syncSearchBox();
  if (had && restore) route().catch(showError);
}

/** Opens a hit: a new route clears the search on hashchange; the same route has to be rendered here. */
function openHit(link) {
  const href = link.getAttribute("href");
  if (href === location.hash) clearSearch();
  else location.hash = href;
}

// ---------------------------------------------------------------------------------------------------------
// Navigation

function renderDatasetTabs(datasetId) {
  for (const tabs of document.querySelectorAll(".datasets")) {
    fill(tabs, manifest.datasets.map((dataset) =>
      el("a", { class: "datasets__tab", href: `#/${dataset.id}`, "aria-current": dataset.id === datasetId ? "page" : null }, dataset.title)));
  }
}

function renderNav(model) {
  app.classList.toggle("is-home", !model);
  if (!model) {
    nav.replaceChildren();
    return;
  }
  const navLink = (route, iconName, text, total) => el("li", {},
    el("a", { class: "nav__link", href: `#/${route}` }, icon(iconName), text, total === undefined ? null : count(total)));
  const sorted = (map) => [...map.keys()].sort((a, b) => a.localeCompare(b));
  const list = (title, names, route) => collapsible(`${model.id}:group:${title}`, { class: "group" },
    el("summary", { class: "group__head" }, title, count(names.length)),
    el("ul", { class: "list" }, names.map((name) =>
      el("li", {}, el("a", { class: "list__link", href: `#/${model.id}/${route}/${name}`, ...navAttrs(model, `${route}/${name}`, name) }, name)))));
  const log = changelogOf(model);
  fill(nav,
    el("ul", { class: "nav__links" },
      navLink(model.id, "overview", "Overview"),
      log ? navLink(`${model.id}/changelog`, "history", "Changelog", log.entries.length) : null,
      navLink(`${model.id}/functions`, "function", "Global functions", model.functions.size),
      navLink(`${model.id}/instances`, "instance", "Instances", model.instances.size),
      navLink(`${model.id}/constants`, "constant", "Constants", model.constants.size),
      model.entities.size ? navLink(`${model.id}/entities`, "entity", "Entity classes", model.entities.size) : null),
    model.sides.map((side) => classTree(model, side)),
    list("Value types", sorted(model.valueTypes), "type"),
    list("Enums", sorted(model.enums), "enum"),
    list("Core Lua", sorted(model.lua), "global"),
  );
  nav.setAttribute("aria-label", model.dataset.title);
}

/**
 * Classes of one side as an inheritance tree. A class with subclasses is a link next to a toggle, not inside
 * it (a link in <summary> is a nested interactive element); the stylesheet lays the link over the toggle row.
 */
function classTree(model, side) {
  const { roots, children, size } = model.classForest(side);
  const classLink = (name) => el("a", { class: "tree__link", href: `#/${model.id}/class/${name}`, ...navAttrs(model, `class/${name}`, name) }, name);
  const node = (name) => {
    const derived = children.get(name);
    if (!derived) return el("li", {}, classLink(name));
    return el("li", { class: "tree__item" }, classLink(name),
      collapsible(`${model.id}:${side}:${name}`, { class: "tree__node" },
        el("summary", { class: "tree__row", "aria-label": `Subclasses of ${name}` }, count(derived.length)),
        el("ul", { class: "tree" }, derived.map(node))));
  };
  const title = model.sides.length > 1 ? `${capitalize(side)} classes` : "Classes";
  return collapsible(`${model.id}:classes:${side}`, { class: "group" },
    el("summary", { class: "group__head" }, title, count(size)),
    el("ul", { class: "tree" }, roots.map(node)));
}

/** Sidebar link the visitor clicked last: the one to keep in view when its page has links in several trees. */
let clickedNavLink = null;

/** Sections a sidebar link is in, innermost first. */
function sectionsOf(link) {
  const sections = [];
  for (let details = link.parentElement.closest("details"); details; details = details.parentElement.closest("details")) sections.push(details);
  return sections;
}

/**
 * Marks the page of the route in the sidebar: its links get aria-current and the classes on the way to them
 * are lifted. A class on both sides has a link in each tree; only one is revealed (its branches opened,
 * scrolled to): the clicked one, else the one hidden the least — a group the visitor collapsed stays collapsed.
 */
function markNav(model, page, name) {
  for (const a of nav.querySelectorAll("[aria-current]")) a.removeAttribute("aria-current");
  for (const a of nav.querySelectorAll(".is-path")) a.classList.remove("is-path");
  // A function's route shows the Global functions page at that function.
  const listed = page === "function" ? "functions" : page;
  const whole = ["functions", "instances", "constants", "entities", "changelog"].includes(listed);
  const target = `#/${[model.id, listed, whole ? null : name].filter(Boolean).join("/")}`;
  const links = [...nav.querySelectorAll("a")].filter((a) => a.getAttribute("href") === target);
  for (const a of links) {
    a.setAttribute("aria-current", "page");
    for (const details of sectionsOf(a)) details.parentElement.querySelector(":scope > .tree__link")?.classList.add("is-path");
  }
  const hidden = (a) => sectionsOf(a).reduce((sum, details) => sum + (details.open ? 0 : details.classList.contains("group") ? 1000 : 1), 0);
  const shown = links.includes(clickedNavLink) ? clickedNavLink
    : links.reduce((best, a) => (best === null || hidden(a) < hidden(best) ? a : best), null);
  clickedNavLink = null;
  if (!shown) return;
  for (const details of sectionsOf(shown)) details.open = true;
  shown.scrollIntoView({ block: "nearest" });
}

function openNav() {
  app.classList.add("is-nav-open");
  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Close navigation");
  // The current page, else the first link: focusing scrolls the drawer to it.
  (nav.querySelector('[aria-current="page"]') ?? nav.querySelector("a"))?.focus();
}

function closeNav() {
  if (!app.classList.contains("is-nav-open")) return;
  app.classList.remove("is-nav-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}

// ---------------------------------------------------------------------------------------------------------
// Routing

/** Number of the latest navigation: a page that finished loading after a newer one started is dropped. */
let routeId = 0;

async function route() {
  const id = ++routeId;
  closeNav();
  const [datasetId, page, name, member] = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  renderDatasetTabs(datasetId);
  const dataset = manifest.datasets.find((d) => d.id === datasetId);
  view.scrollTop = 0;
  if (!dataset) {
    currentModel = null;
    renderNav(null);
    return datasetId ? pageNotFound(null, "dataset", datasetId) : pageHome();
  }
  if (dataset.kind !== "vscripts-api") return pageNotFound(null, "viewer for the dataset kind", dataset.kind);
  if (!models.has(dataset.id)) pageLoading(dataset);
  const model = await loadModel(dataset);
  if (id !== routeId) return;
  if (model !== currentModel) {
    currentModel = model;
    renderNav(model);
  }
  markNav(model, page, name);
  const pages = {
    undefined: () => pageOverview(model),
    "": () => pageOverview(model),
    class: () => pageClass(model, name, member),
    type: () => pageValueType(model, name, member),
    function: () => pageFunctions(model, name),
    functions: () => pageFunctions(model),
    instances: () => pageInstances(model, name),
    enum: () => pageEnum(model, name, member),
    global: () => pageGlobal(model, name, member),
    constants: () => pageConstants(model, name),
    entities: () => pageEntities(model, name),
    changelog: () => pageChangelog(model, name),
  };
  (pages[page] ?? (() => pageNotFound(model, "page", page)))();
}

async function start() {
  renderThemeButton();
  themeButton.addEventListener("click", toggleTheme);
  systemLight.addEventListener("change", renderThemeButton);

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
  if (!manifest) {
    show(emptyState({ iconName: "error", title: "No data", text: ["The site could not find ", code("data/index.json"), "."], failed: true }));
    return;
  }
  for (const repo of document.querySelectorAll(".repo")) repo.href = manifest.repository;

  // "toggle" does not bubble; a capturing listener on the sidebar still sees it.
  nav.addEventListener("toggle", (event) => {
    const id = event.target.dataset?.id;
    if (!id) return;
    if (event.target.open) collapsed.delete(id);
    else collapsed.add(id);
    saveCollapsed();
  }, true);
  nav.addEventListener("click", (event) => {
    clickedNavLink = event.target.closest("a");
  });

  search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    activeHit = 0;
    syncSearchBox();
    searchTimer = setTimeout(() => (search.value.trim() ? renderSearch().catch(showError) : clearSearch()), 100);
  });
  search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveHit(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      const link = view.querySelector(".hit__link.is-active");
      if (link) {
        openHit(link);
        search.blur();
      }
    } else if (event.key === "Escape") {
      clearSearch();
    }
  });
  search.closest(".search").querySelector(".search__clear").addEventListener("click", () => {
    clearSearch();
    search.focus();
  });
  view.addEventListener("click", (event) => {
    const link = event.target.closest(".hit__link");
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    openHit(link);
  });

  menuButton.addEventListener("click", () => (app.classList.contains("is-nav-open") ? closeNav() : openNav()));
  document.querySelector(".scrim").addEventListener("click", closeNav);
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      search.focus();
      search.select();
    } else if (event.key === "Escape" && app.classList.contains("is-nav-open")) {
      closeNav();
      menuButton.focus();
    }
  });

  window.addEventListener("hashchange", () => {
    clearSearch({ restore: false });
    route().catch(showError);
    // Keyboard and screen reader users land on the new page.
    if (document.activeElement !== search) view.focus({ preventScroll: true });
  });
  syncSearchBox();
  await route();
}

start().catch(showError);
