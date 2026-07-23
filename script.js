const SHARED_CONTENT = {
  config: "/structure/site-config.json",
  header: "/structure/header.html",
  footer: "/structure/footer.html"
};

document.addEventListener("DOMContentLoaded", () => {
  initializeSharedLayout();
  initializeLatestHomework();
  initializeCollapsibles();
  initializeSocialIconHovers(document);
});

async function initializeSharedLayout() {
  const headerPlaceholder = document.getElementById("header-placeholder");
  const footerPlaceholder = document.getElementById("footer-placeholder");

  if (!headerPlaceholder && !footerPlaceholder) {
    return;
  }

  try {
    const [config, headerHtml, footerHtml] = await Promise.all([
      fetchJson(SHARED_CONTENT.config),
      headerPlaceholder ? fetchText(SHARED_CONTENT.header) : Promise.resolve(""),
      footerPlaceholder ? fetchText(SHARED_CONTENT.footer) : Promise.resolve("")
    ]);

    if (headerPlaceholder) {
      headerPlaceholder.innerHTML = headerHtml;
      renderHeader(config);
      requestAnimationFrame(() => {
        headerPlaceholder.classList.add("is-ready");
      });
    }

    if (footerPlaceholder) {
      footerPlaceholder.innerHTML = footerHtml;
      renderFooter(config, footerPlaceholder.dataset.footerVariant || "default");
    }

    initializeRegistrationForm(config.registration || {});
    initializeSocialIconHovers(document);
  } catch (error) {
    console.error("Die gemeinsame Seitenstruktur konnte nicht geladen werden:", error);
  }
}

async function fetchText(url) {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  return response.json();
}

function renderHeader(config) {
  const school = config.school || {};
  const homeLink = document.getElementById("school-home-link");
  const schoolName = document.getElementById("school-name");
  const schoolLogo = document.getElementById("school-logo");
  const menu = document.getElementById("menu");

  homeLink.href = school.homeUrl || "/index.html";
  schoolName.textContent = school.name || "";
  schoolLogo.src = school.logoUrl || "";
  schoolLogo.alt = school.logoAlt || "";

  menu.replaceChildren(
    ...(config.navigation || []).map((item, index) =>
      createNavigationItem(item, `menu-item-${index}`)
    )
  );

  markCurrentMenuItem(menu);
  initializeMenu(menu);
  renderLanguageSwitcher(config.translations || {});
}

function createNavigationItem(item, itemId) {
  const listItem = document.createElement("li");
  const children = Array.isArray(item.children) ? item.children : [];

  if (!children.length) {
    listItem.append(createMenuLink(item));
    return listItem;
  }

  listItem.classList.add("has-submenu");

  const entry = document.createElement("div");
  entry.className = "menu-entry";

  let toggle;

  if (item.href) {
    entry.append(createMenuLink(item));
    toggle = document.createElement("button");
    toggle.className = "submenu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", `فتح القائمة الفرعية: ${item.label}`);
    toggle.textContent = "▾";
  } else {
    toggle = document.createElement("button");
    toggle.className = "menu-link submenu-label";
    toggle.type = "button";
    toggle.textContent = item.label;
  }

  const submenuId = `${itemId}-submenu`;
  toggle.setAttribute("aria-controls", submenuId);
  toggle.setAttribute("aria-expanded", "false");
  entry.append(toggle);

  const submenu = document.createElement("ul");
  submenu.className = "submenu";
  submenu.id = submenuId;
  submenu.replaceChildren(
    ...children.map((child, index) =>
      createNavigationItem(child, `${itemId}-${index}`)
    )
  );

  toggle.addEventListener("click", event => {
    event.stopPropagation();
    const willOpen = !listItem.classList.contains("submenu-open");

    closeSiblingSubmenus(listItem);
    setSubmenuState(listItem, willOpen);
  });

  listItem.append(entry, submenu);
  return listItem;
}

function createMenuLink(item) {
  const link = document.createElement("a");
  link.className = "menu-link";
  link.href = item.href || "#";
  link.textContent = item.label || "";

  if (Array.isArray(item.activePaths)) {
    link.dataset.activePaths = item.activePaths
      .map(path => normalizePath(path))
      .join(",");
  }

  return link;
}

function closeSiblingSubmenus(listItem) {
  const siblings = listItem.parentElement?.children || [];

  Array.from(siblings).forEach(sibling => {
    if (sibling !== listItem && sibling.classList.contains("has-submenu")) {
      setSubmenuState(sibling, false);
    }
  });
}

function setSubmenuState(listItem, isOpen) {
  listItem.classList.toggle("submenu-open", isOpen);
  const toggle = listItem.querySelector(":scope > .menu-entry > [aria-expanded]");

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(isOpen));
  }

  if (!isOpen) {
    listItem.querySelectorAll(".submenu-open").forEach(child => {
      setSubmenuState(child, false);
    });
  }
}

function initializeMenu(menu) {
  const menuToggle = document.getElementById("menu-toggle");
  const header = menu.closest("header");

  const closeMenu = () => {
    menu.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    menu.querySelectorAll(".submenu-open").forEach(item => {
      setSubmenuState(item, false);
    });
  };

  menuToggle.addEventListener("click", event => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("show");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.addEventListener("click", event => {
    if (event.target.closest("a") && window.matchMedia("(max-width: 768px)").matches) {
      closeMenu();
    }
  });

  document.addEventListener("click", event => {
    if (!header.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", event => {
    const menuIsOpen =
      menu.classList.contains("show") ||
      Boolean(menu.querySelector(".submenu-open"));

    if (event.key === "Escape" && menuIsOpen) {
      closeMenu();
      menuToggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (!window.matchMedia("(max-width: 1100px)").matches) {
      closeMenu();
    }
  });
}

function markCurrentMenuItem(menu) {
  const currentPath = normalizePath(window.location.pathname);

  menu.querySelectorAll("a[href]").forEach(link => {
    const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
    const activePaths = (link.dataset.activePaths || "")
      .split(",")
      .filter(Boolean);

    if (linkPath === currentPath || activePaths.includes(currentPath)) {
      link.setAttribute("aria-current", "page");
      link.closest(".has-submenu")?.classList.add("contains-current-page");
    }
  });
}

function normalizePath(path) {
  const withoutIndex = path.replace(/\/index\.html$/i, "/");
  return withoutIndex.length > 1 ? withoutIndex.replace(/\/$/, "") : withoutIndex;
}

function renderLanguageSwitcher(translations) {
  const container = document.getElementById("language-switcher");

  if (!container) {
    return;
  }

  const currentPath = normalizePath(window.location.pathname);
  const pageConfig = translations[currentPath];

  if (!pageConfig || !Array.isArray(pageConfig.options)) {
    return;
  }

  const currentOption =
    pageConfig.options.find(option => option.id === pageConfig.current) ||
    pageConfig.options[0];

  const trigger = document.createElement("button");
  trigger.className = "language-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-label", pageConfig.ariaLabel || "Sprache auswählen");

  const globe = document.createElement("span");
  globe.className = "globe-icon";
  globe.setAttribute("aria-hidden", "true");

  const currentCode = document.createElement("span");
  currentCode.textContent = currentOption?.code || "";

  const arrow = document.createElement("span");
  arrow.className = "language-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "▾";

  trigger.append(globe, currentCode, arrow);

  const options = document.createElement("ul");
  options.className = "language-options";
  options.hidden = true;

  pageConfig.options.forEach(option => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = option.href;
    link.hreflang = option.lang;
    link.lang = option.lang;
    link.dir = option.lang === "ar" ? "rtl" : "ltr";

    if (option.id === pageConfig.current) {
      link.setAttribute("aria-current", "page");
    }

    const code = document.createElement("span");
    code.className = "language-code";
    code.textContent = option.code;

    const label = document.createElement("span");
    label.textContent = option.label;

    link.append(code, label);
    item.append(link);
    options.append(item);
  });

  const closeLanguageMenu = () => {
    options.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };

  trigger.addEventListener("click", event => {
    event.stopPropagation();
    const willOpen = options.hidden;
    options.hidden = !willOpen;
    trigger.setAttribute("aria-expanded", String(willOpen));
  });

  document.addEventListener("click", event => {
    if (!container.contains(event.target)) {
      closeLanguageMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !options.hidden) {
      closeLanguageMenu();
      trigger.focus();
    }
  });

  container.replaceChildren(trigger, options);
  container.hidden = false;
}

function initializeRegistrationForm(registrationConfig) {
  const container = document.getElementById("registration-form");
  const jetFormUrl = registrationConfig.jetFormUrl?.trim();

  if (!container || !jetFormUrl) {
    return;
  }

  let url;

  try {
    url = new URL(jetFormUrl);
  } catch {
    console.error("Die JetForm-URL ist ungültig.");
    return;
  }

  if (url.protocol !== "https:") {
    console.error("Die JetForm-URL muss HTTPS verwenden.");
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = url.href;
  iframe.title = container.dataset.iframeTitle || "Anmeldeformular";
  iframe.loading = "lazy";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.style.minHeight = `${registrationConfig.minimumHeight || 900}px`;
  container.removeAttribute("aria-labelledby");
  container.setAttribute("aria-label", iframe.title);
  container.replaceChildren(iframe);
}

function renderFooter(config, variantName) {
  const footer = document.getElementById("site-footer");

  if (!footer) {
    return;
  }

  const variant =
    config.footerVariants?.[variantName] ||
    config.footerVariants?.default ||
    {};

  if (Array.isArray(variant.copyrightLines)) {
    footer.replaceChildren(
      ...variant.copyrightLines.map(line => {
        const paragraph = document.createElement("p");
        paragraph.textContent = line;
        return paragraph;
      })
    );
    return;
  }

  const selectedLabels = new Set(variant.socialLinks || []);
  const socialLinks = (config.socialLinks || []).filter(item =>
    selectedLabels.has(item.label)
  );
  const container = document.createElement("div");
  container.className = "social-icons";

  const links = socialLinks.map(item => {
    const link = document.createElement("a");
    link.href = item.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", item.label);

    const image = document.createElement("img");
    image.src = item.icon;
    image.alt = item.label;
    image.width = 24;
    image.height = 24;

    if (variant.hoverIcons !== false && item.hoverIcon) {
      image.dataset.hover = item.hoverIcon;
    }

    link.append(image);
    return link;
  });

  container.replaceChildren(...links);
  footer.replaceChildren(container);
}

function initializeSocialIconHovers(root) {
  root.querySelectorAll(".social-icons img[data-hover]").forEach(image => {
    if (image.dataset.hoverInitialized === "true") {
      return;
    }

    image.dataset.hoverInitialized = "true";
    image.dataset.originalSrc = image.getAttribute("src");

    const showHoverIcon = () => {
      image.src = image.dataset.hover;
    };

    const showOriginalIcon = () => {
      image.src = image.dataset.originalSrc;
    };

    image.addEventListener("mouseenter", showHoverIcon);
    image.addEventListener("mouseleave", showOriginalIcon);
    image.parentElement?.addEventListener("focus", showHoverIcon);
    image.parentElement?.addEventListener("blur", showOriginalIcon);
  });
}

async function initializeLatestHomework() {
  const container = document.getElementById("latest-homework");

  if (!container) {
    return;
  }

  try {
    const data = await fetchJson("/pdfs/HA/latest_homework.json");
    const paragraph = document.createElement("p");

    if (data.href) {
      const link = document.createElement("a");
      link.href = data.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = data.label;
      paragraph.append(link);
    } else {
      paragraph.textContent = data.label;
    }

    container.replaceChildren(paragraph);
  } catch (error) {
    console.error("Fehler beim Laden der neuesten Hausaufgabe:", error);
    const paragraph = document.createElement("p");
    paragraph.textContent = "حدث خطأ أثناء تحميل الواجب البيتي.";
    container.replaceChildren(paragraph);
  }
}

function initializeCollapsibles() {
  const collapsibles = document.querySelectorAll(".collapsible");

  collapsibles.forEach((collapsible, index) => {
    const content = collapsible.nextElementSibling;

    if (!content?.classList.contains("content")) {
      return;
    }

    const contentId = content.id || `collapsible-content-${index}`;
    content.id = contentId;
    collapsible.tabIndex = 0;
    collapsible.setAttribute("role", "button");
    collapsible.setAttribute("aria-controls", contentId);
    collapsible.setAttribute("aria-expanded", "false");

    const toggle = () => {
      const isOpen = content.classList.toggle("open");
      collapsible.classList.toggle("active", isOpen);
      collapsible.setAttribute("aria-expanded", String(isOpen));
      content.style.maxHeight = isOpen ? `${content.scrollHeight}px` : "";
    };

    collapsible.addEventListener("click", toggle);
    collapsible.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggle();
      }
    });
  });

  window.addEventListener("resize", () => {
    document.querySelectorAll(".content.open").forEach(content => {
      content.style.maxHeight = `${content.scrollHeight}px`;
    });
  });
}
