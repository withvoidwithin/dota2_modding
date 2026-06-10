export function render(json, panel) {
    const header = panel.querySelector(".panel-header");
    const body   = panel.querySelector(".panel-body");

    header.innerHTML = `<span>PANORAMA CSS PROPERTIES</span><span>${json.meta.count} entries</span>`;

    json.data.forEach((item, i) => {
        const el = document.createElement("div");
        el.className = "list-item";
        el.style.padding = "8px 12px";

        const idx = document.createElement("span");
        idx.className = "list-item-index";
        idx.textContent = i + 1;

        const nameSpan = document.createElement("span");
        nameSpan.textContent = item.name;

        el.appendChild(idx);
        el.appendChild(nameSpan);

        if (item.description && item.description !== "<Needs a description>") {
            const desc = document.createElement("div");
            desc.style.cssText = "font-family:var(--sans);font-size:12px;color:var(--dim);margin-top:3px;";
            desc.innerHTML = item.description;
            el.appendChild(desc);
        }

        body.appendChild(el);
    });
}