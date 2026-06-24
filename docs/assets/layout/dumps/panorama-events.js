import { header, item, meta, desc, fill } from "./_shared.js";

export function render(json, panel) {
    header(panel, "PANORAMA EVENTS", json.meta.count);

    const rows = json.data.map((event, i) => {
        const el = item(i);
        el.appendChild(document.createTextNode(event.signature));

        const m = meta(el);
        const flag = document.createElement("span");
        flag.className = event.panelEvent ? "tag-on" : "tag-off";
        flag.textContent = event.panelEvent ? "panel event" : "not a panel event";
        m.appendChild(flag);

        if (event.description) desc(el, event.description);
        return el;
    });

    fill(panel, rows);
}
