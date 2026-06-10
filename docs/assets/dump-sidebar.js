class DumpSidebar extends HTMLElement {
    async connectedCallback() {
        const base = this.getAttribute("base") ?? "../";

        let dumps = [];
        try {
            const res = await fetch(`${base}manifest.json`);
            dumps = await res.json();
        } catch {}

        const active = new URLSearchParams(window.location.search).get("dump") ?? "";

        this.innerHTML = dumps.map(({ label }) => {
            const isActive = label === active ? " active" : "";
            return `<a class="dump-sidebar-item${isActive}" href="?dump=${label}">${label}</a>`;
        }).join("");
    }
}

customElements.define("dump-sidebar", DumpSidebar);