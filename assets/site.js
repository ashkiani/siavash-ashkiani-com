(() => {
  const year = new Date().getFullYear();

  // You can tweak these in ONE place later.
  const BRAND_TITLE = "Siavash Ashkiani";
  const BRAND_SUBTITLE = "Projects • notes • practical guides • hands-on work";

  const navItems = [
    { href: "https://ashkiani.com", label: "Apex · Directory" },
    { href: "./", label: "Home" },
    { href: "./woodworking/", label: "Woodworking", disabled: true },
    { href: "./resume/", label: "Resume", disabled: true },
  ];

  function normalizePath(path) {
    // Treat /projects and /projects/ as same.
    if (!path.endsWith("/")) return path + "/";
    return path;
  }

    function renderNav() {
    const current = normalizePath(window.location.pathname);

    return `
        <nav class="nav" aria-label="Primary">
        ${navItems
            .map((item) => {
            const href = normalizePath(item.href);
            const isActive = !item.disabled && current === href;

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
            .join("")}
        </nav>
    `;
    }

  function renderHeader() {
    return `
      <header class="wrap">
        <div class="brand">
          <div class="mark" aria-hidden="true"></div>
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