export function render(json, panel) {
    const header = panel.querySelector(".panel-header");
    const body   = panel.querySelector(".panel-body");

    header.innerHTML = `
        <input type="text" id="dump-search" class="search-input" placeholder="search..." autocomplete="off" />
        <span id="dump-count"></span>
    `;

    const allData = json.data;

    function renderList(data) {
        body.innerHTML = "";
        document.getElementById("dump-count").textContent = data.length + " entries";
        data.forEach((name, i) => {
            const el  = document.createElement("div");
            el.className = "list-item";
            const idx = document.createElement("span");
            idx.className = "list-item-index";
            idx.textContent = i + 1;
            el.appendChild(idx);
            el.appendChild(document.createTextNode(name));
            body.appendChild(el);
        });
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