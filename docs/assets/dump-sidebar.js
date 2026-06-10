class DumpSidebar extends HTMLElement {
    connectedCallback() {
        const dumps = [
            { id: 'modifier-list',           label: 'modifier_list' },
            { id: 'panorama-css-properties', label: 'panorama_css_properties' },
            { id: 'panorama-events',         label: 'panorama_events' },
            { id: 'cvarlist',                label: 'cvarlist' },
        ];

        const currentPath = window.location.pathname;

        this.innerHTML = dumps.map(({ id, label }) => {
            const active = currentPath.includes(`/${id}/`) ? ' active' : '';
            return `<a class="dump-sidebar-item${active}" href="../${id}/">${label}</a>`;
        }).join('');
    }
}

customElements.define('dump-sidebar', DumpSidebar);