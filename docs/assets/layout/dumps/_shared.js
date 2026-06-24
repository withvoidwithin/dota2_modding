// Shared building blocks for dump layouts. Keeps the per-dump renderers small
// and the markup/classes consistent (styling lives in style.css, not inline).

export function header(panel, title, count) {
    panel.querySelector(".panel-header").innerHTML =
        `<span>${title}</span><span>${count} entries</span>`;
}

// Builds a list row with the leading index. `block` toggles the roomier
// padding used by detail layouts (cvarlist, panorama) vs. the compact list.
export function item(i, { block = true } = {}) {
    const el = document.createElement("div");
    el.className = block ? "list-item list-item--block" : "list-item";

    const idx = document.createElement("span");
    idx.className = "list-item-index";
    idx.textContent = i + 1;
    el.appendChild(idx);

    return el;
}

export function meta(parent) {
    const el = document.createElement("div");
    el.className = "list-item-meta";
    parent.appendChild(el);
    return el;
}

export function desc(parent, content, { html = false } = {}) {
    const el = document.createElement("div");
    el.className = "list-item-desc";
    if (html) el.innerHTML = content;
    else el.textContent = content;
    parent.appendChild(el);
    return el;
}

// Replaces the panel body with freshly built rows in a single DOM write.
export function fill(panel, rows) {
    const body = panel.querySelector(".panel-body");
    const frag = document.createDocumentFragment();
    rows.forEach(el => frag.appendChild(el));
    body.replaceChildren(frag);
}
