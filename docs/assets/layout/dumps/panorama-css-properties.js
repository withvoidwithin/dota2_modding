import { header, item, desc, fill } from "./_shared.js";

export function render(json, panel) {
    header(panel, "PANORAMA CSS PROPERTIES", json.meta.count);

    const rows = json.data.map((prop, i) => {
        const el = item(i);
        el.appendChild(document.createTextNode(prop.name));

        if (prop.description && prop.description !== "<Needs a description>") {
            desc(el, prop.description, { html: true });
        }
        return el;
    });

    fill(panel, rows);
}
