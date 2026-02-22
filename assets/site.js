(() => {
  const year = new Date().getFullYear();

  const BRAND_TITLE = "Siavash Ashkiani";
  const BRAND_SUBTITLE = "Projects • notes • practical guides • hands-on work";

  // Left side (site sections)
  const navLeft = [
    { href: "/", label: "Home" },
    { href: "/woodworking/", label: "Woodworking", disabled: true },
    { href: "/resume/", label: "Resume", disabled: true },
  ];

  // Right side (utilities / external)
  const navRight = [
    { href: "/contact", label: "Contact" },          // scrolls to Contact card
    { href: "https://ashkiani.com", label: "Apex · Directory" },
  ];

  function normalizePath(path) {
    if (!path.endsWith("/")) return path + "/";
    return path;
  }

  function renderNavGroup(items, current) {
    return items
      .map((item) => {
        const hrefNorm = normalizePath(item.href);
        const isActive = !item.disabled && current === hrefNorm;

        if (item.disabled) {
          return `
            <span class="nav-link nav-link-disabled" aria-disabled="true">
              ${item.label}
            </span>
          `;
        }

        return `
          <a class="nav-link${isActive ? " is-active" : ""}" href="${item.href}">
            ${item.label}
          </a>
        `;
      })
      .join("");
  }

  function renderNav() {
    const current = normalizePath(window.location.pathname);

    return `
      <nav class="nav" aria-label="Primary">
        <div class="nav-left">
          ${renderNavGroup(navLeft, current)}
        </div>

        <div class="nav-right">
          ${renderNavGroup(navRight, current)}
        </div>
      </nav>
    `;
  }

  function renderHeader() {
    return `
      <header class="wrap">
        <div class="brand">
          <div class="mark" aria-hidden="true">
            <span class="prompt">&gt;</span><span class="cursor">_</span>
          </div>
          <div class="brand-text">
            <div class="title">${BRAND_TITLE}</div>
            <div class="subtitle">${BRAND_SUBTITLE}</div>
          </div>
        </div>
        ${renderNav()}
      </header>
    `;
  }

  function renderFooter() {
    return `
      <footer class="footer">
        <span class="mono">© ${year} Ashkiani</span>
      </footer>
    `;
  }

  const headerMount = document.getElementById("site-header");
  if (headerMount) headerMount.innerHTML = renderHeader();

  const footerMount = document.getElementById("site-footer");
  if (footerMount) footerMount.innerHTML = renderFooter();
})();