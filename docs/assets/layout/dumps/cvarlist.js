import { header, item, meta, desc, fill } from "./_shared.js";

export function render(json, panel) {
    header(panel, "CVARLIST", json.meta.count);

    const rows = json.data.map((cvar, i) => {
        const el = item(i);
        el.appendChild(document.createTextNode(cvar.name));

        const m = meta(el);
        const value = document.createElement("span");
        value.className = "list-item-value";
        value.textContent = cvar.value;
        m.appendChild(value);

        if (cvar.flags?.length) {
            m.appendChild(document.createTextNode("  "));
            cvar.flags.forEach(flag => {
                const f = document.createElement("span");
                f.className = "list-item-flag";
                f.textContent = flag;
                m.appendChild(f);
            });
        }

        if (cvar.description) desc(el, cvar.description);
        return el;
    });

    fill(panel, rows);
}
