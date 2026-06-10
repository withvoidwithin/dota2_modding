export function render(json, panel) {
    const header = panel.querySelector(".panel-header");
    const body   = panel.querySelector(".panel-body");

    header.innerHTML = `<span>PANORAMA EVENTS</span><span>${json.meta.count} entries</span>`;

    json.data.forEach((item, i) => {
        const el = document.createElement("div");
        el.className = "list-item";
        el.style.padding = "8px 12px";

        const idx = document.createElement("span");
        idx.className = "list-item-index";
        idx.textContent = i + 1;

        const sig = document.createElement("span");
        sig.textContent = item.signature;

        const meta = document.createElement("div");
        meta.style.cssText = "font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:3px;";

        const panelSpan = document.createElement("span");
        panelSpan.style.color = item.panelEvent ? "var(--online)" : "var(--offline)";
        panelSpan.textContent = item.panelEvent ? "panel event" : "not a panel event";
        meta.appendChild(panelSpan);

        el.appendChild(idx);
        el.appendChild(sig);
        el.appendChild(meta);

        if (item.description) {
            const desc = document.createElement("div");
            desc.style.cssText = "font-family:var(--sans);font-size:12px;color:var(--dim);margin-top:3px;";
            desc.textContent = item.description;
            el.appendChild(desc);
        }

        body.appendChild(el);
    });
}