class SiteHeader extends HTMLElement {
  connectedCallback() {
    const base = this.getAttribute('base') ?? '';
    const active = this.getAttribute('active') ?? '';

    this.innerHTML = `
      <span class="header-title">
        ${base ? `<a href="${base}">DOTA 2 API DUMPER</a>` : 'DOTA 2 API DUMPER'}
      </span>
      <nav>
        <a href="${base}dumps/modifier-list/" ${active === 'modifier_list' ? 'class="active"' : ''}>modifier_list</a>
      </nav>
    `;
  }
}

customElements.define('site-header', SiteHeader);