export function render(json, panel) {
    const header = panel.querySelector(".panel-header");
    const body   = panel.querySelector(".panel-body");

    header.innerHTML = `<span>CVARLIST</span><span>${json.meta.count} entries</span>`;

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

        const meta = document.createElement("div");
        meta.style.cssText = "font-family:var(--mono);font-size:11px;color:var(--dim);margin-top:3px;";

        const valueSpan = document.createElement("span");
        valueSpan.style.opacity = ".7";
        valueSpan.textContent = item.value;
        meta.appendChild(valueSpan);

        if (item.flags && item.flags.length > 0) {
            meta.appendChild(document.createTextNode("  "));
            item.flags.forEach(flag => {
                const f = document.createElement("span");
                f.style.cssText = "display:inline-block;border:1px solid var(--border);border-radius:2px;padding:0 4px;margin-right:4px;font-size:10px;";
                f.textContent = flag;
                meta.appendChild(f);
            });
        }

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