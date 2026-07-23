document.addEventListener("DOMContentLoaded", () => {
  const menu = document.getElementById("menu");

  if (menu) {
    markCurrentMenuItem(menu);
    initializeSubmenus(menu);
    initializeMenu(menu);
  }

  initializeLanguageSwitcher();
  initializeRegistrationForm();
  initializeLatestHomework();
  initializeCollapsibles();
  initializeSocialIconHovers(document);
});

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-cache" });

  if (!response.ok) {
    throw new Error(`${url}: HTTP ${response.status}`);
  }

  return response.json();
}

function initializeSubmenus(menu) {
  menu.querySelectorAll(".has-submenu").forEach(listItem => {
    const toggle = listItem.querySelector(
      ":scope > .menu-entry > [aria-controls]"
    );

    if (!toggle) {
      return;
    }

    toggle.addEventListener("click", event => {
      event.stopPropagation();
      const willOpen = !listItem.classList.contains("submenu-open");

      closeSiblingSubmenus(listItem);
      setSubmenuState(listItem, willOpen);
    });
  });
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

  if (!menuToggle || !header) {
    return;
  }

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
    if (event.target.closest("a") && window.matchMedia("(max-width: 1100px)").matches) {
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

function initializeLanguageSwitcher() {
  const container = document.getElementById("language-switcher");

  if (!container || container.hidden) {
    return;
  }

  const trigger = container.querySelector(".language-trigger");
  const options = container.querySelector(".language-options");

  if (!trigger || !options) {
    return;
  }

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

}

function initializeRegistrationForm() {
  const container = document.getElementById("registration-form");
  const jetFormUrl = container?.dataset.jetFormUrl?.trim();

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
  const minimumHeight =
    Number.parseInt(container.dataset.minimumHeight, 10) || 900;
  iframe.style.minHeight = `${minimumHeight}px`;
  container.removeAttribute("aria-labelledby");
  container.setAttribute("aria-label", iframe.title);
  container.replaceChildren(iframe);
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
