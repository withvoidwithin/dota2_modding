class SiteHeader extends HTMLElement {
    connectedCallback() {
        const base          = this.getAttribute('base') ?? '';
        const activeSection = this.getAttribute('active-section') ?? '';

        const sections = [
            { id: 'documentation', label: 'DOCUMENTATION', href: null },
            { id: 'dumps',         label: 'DUMPS',         href: `${base}dumps/` },
            { id: 'libs',          label: 'LIBS',          href: null },
            { id: 'tools',         label: 'TOOLS',         href: null },
        ];

        const navHtml = sections.map(({ id, label, href }) => {
            if (!href) {
                return `<span class="nav-item nav-item--disabled">${label}</span>`;
            }
            const active = activeSection === id ? ' nav-item--active' : '';
            return `<a class="nav-item${active}" href="${href}">${label}</a>`;
        }).join('');

        this.innerHTML = `
            <span class="header-logo"><a href="${base}">DOTA 2 MODDING</a></span>
            <nav class="header-nav">${navHtml}</nav>
        `;
    }
}

customElements.define('site-header', SiteHeader);