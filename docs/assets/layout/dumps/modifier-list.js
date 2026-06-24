import { item, fill } from "./_shared.js";

export function render(json, panel) {
    panel.querySelector(".panel-header").innerHTML = `
        <input type="text" id="dump-search" class="search-input" placeholder="search..." autocomplete="off" />
        <span id="dump-count"></span>
    `;

    const allData = json.data;

    function renderList(data) {
        document.getElementById("dump-count").textContent = data.length + " entries";
        fill(panel, data.map((name, i) => {
            const el = item(i, { block: false });
            el.appendChild(document.createTextNode(name));
            return el;
        }));
    }

    document.getElementById("dump-search").addEventListener("input", (e) => {
        const terms = e.target.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
        const filtered = terms.length === 0
            ? allData
            : allData.filter(name => terms.every(t => name.toLowerCase().includes(t)));
        renderList(filtered);
    });

    renderList(allData);
}
