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
        <a href="${base}dumps/panorama-css-properties/" ${active === 'panorama_css_properties' ? 'class="active"' : ''}>panorama_css_properties</a>
      </nav>
    `;
  }
}

customElements.define('site-header', SiteHeader);