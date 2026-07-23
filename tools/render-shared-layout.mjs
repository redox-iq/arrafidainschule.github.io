import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolsDirectory, "..");
const configPath = path.join(projectRoot, "structure", "site-config.json");
const config = JSON.parse(await readFile(configPath, "utf8"));

const HEADER_START = "<!-- shared-header:start -->";
const HEADER_END = "<!-- shared-header:end -->";
const FOOTER_START = "<!-- shared-footer:start -->";
const FOOTER_END = "<!-- shared-footer:end -->";

const escapeHtml = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const normalizePath = value => {
  const pathname = String(value || "/").split(/[?#]/, 1)[0];
  const withoutIndex = pathname.replace(/\/index\.html$/i, "/");
  const withLeadingSlash = withoutIndex.startsWith("/")
    ? withoutIndex
    : `/${withoutIndex}`;
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/$/, "")
    : withLeadingSlash;
};

const isCurrentItem = (item, currentPath) => {
  const paths = [item.href, ...(item.activePaths || [])]
    .filter(Boolean)
    .map(normalizePath);
  return paths.includes(currentPath);
};

const containsCurrentItem = (item, currentPath) =>
  isCurrentItem(item, currentPath) ||
  (item.children || []).some(child =>
    containsCurrentItem(child, currentPath)
  );

function renderMenuLink(item, currentPath) {
  const activePaths = (item.activePaths || [])
    .map(normalizePath)
    .join(",");
  const attributes = [
    'class="menu-link"',
    `href="${escapeHtml(item.href || "#")}"`,
    activePaths
      ? `data-active-paths="${escapeHtml(activePaths)}"`
      : "",
    isCurrentItem(item, currentPath) ? 'aria-current="page"' : ""
  ].filter(Boolean);

  return `<a ${attributes.join(" ")}>${escapeHtml(item.label)}</a>`;
}

function renderMenuItem(item, currentPath, itemId, depth = 0) {
  const indentation = "  ".repeat(depth);
  const children = Array.isArray(item.children) ? item.children : [];

  if (!children.length) {
    return `${indentation}<li>${renderMenuLink(item, currentPath)}</li>`;
  }

  const containsCurrent = containsCurrentItem(item, currentPath);
  const listClasses = [
    "has-submenu",
    containsCurrent ? "contains-current-page" : ""
  ].filter(Boolean);
  const submenuId = `${itemId}-submenu`;
  const entry = item.href
    ? `${renderMenuLink(item, currentPath)}
${indentation}    <button class="submenu-toggle" type="button" aria-label="فتح القائمة الفرعية: ${escapeHtml(item.label)}" aria-controls="${submenuId}" aria-expanded="false">▾</button>`
    : `<button class="menu-link submenu-label" type="button" aria-controls="${submenuId}" aria-expanded="false">${escapeHtml(item.label)}</button>`;
  const renderedChildren = children
    .map((child, index) =>
      renderMenuItem(child, currentPath, `${itemId}-${index}`, depth + 2)
    )
    .join("\n");

  return `${indentation}<li class="${listClasses.join(" ")}">
${indentation}  <div class="menu-entry">
${indentation}    ${entry}
${indentation}  </div>
${indentation}  <ul class="submenu" id="${submenuId}">
${renderedChildren}
${indentation}  </ul>
${indentation}</li>`;
}

function renderLanguageSwitcher(currentPath) {
  const pageConfig = config.translations?.[currentPath];

  if (!pageConfig || !Array.isArray(pageConfig.options)) {
    return '    <div class="language-switcher" id="language-switcher" hidden></div>';
  }

  const currentOption =
    pageConfig.options.find(option => option.id === pageConfig.current) ||
    pageConfig.options[0];
  const options = pageConfig.options
    .map(option => {
      const current =
        option.id === pageConfig.current ? ' aria-current="page"' : "";
      const direction = option.lang === "ar" ? "rtl" : "ltr";

      return `        <li><a href="${escapeHtml(option.href)}" hreflang="${escapeHtml(option.lang)}" lang="${escapeHtml(option.lang)}" dir="${direction}"${current}><span class="language-code">${escapeHtml(option.code)}</span><span>${escapeHtml(option.label)}</span></a></li>`;
    })
    .join("\n");

  return `    <div class="language-switcher" id="language-switcher">
      <button class="language-trigger" type="button" aria-expanded="false" aria-haspopup="true" aria-label="${escapeHtml(pageConfig.ariaLabel || "Sprache auswählen")}">
        <span class="globe-icon" aria-hidden="true"></span>
        <span>${escapeHtml(currentOption?.code)}</span>
        <span class="language-arrow" aria-hidden="true">▾</span>
      </button>
      <ul class="language-options" hidden>
${options}
      </ul>
    </div>`;
}

function renderHeader(currentPath) {
  const school = config.school || {};
  const navigation = (config.navigation || [])
    .map((item, index) =>
      renderMenuItem(item, currentPath, `menu-item-${index}`, 3)
    )
    .join("\n");

  return `${HEADER_START}
<header dir="rtl">
  <a class="logo" id="school-home-link" href="${escapeHtml(school.homeUrl || "/index.html")}">
    <span id="school-name">${escapeHtml(school.name)}</span>
    <img id="school-logo" class="school-logo" src="${escapeHtml(school.logoUrl)}" alt="${escapeHtml(school.logoAlt)}" />
  </a>
  <nav aria-label="القائمة الرئيسية">
    <ul id="menu">
${navigation}
    </ul>
${renderLanguageSwitcher(currentPath)}
    <button class="hamburger" id="menu-toggle" type="button" aria-controls="menu" aria-expanded="false" aria-label="فتح القائمة">☰</button>
  </nav>
</header>
${HEADER_END}`;
}

function renderFooter(variantName) {
  const variant =
    config.footerVariants?.[variantName] ||
    config.footerVariants?.default ||
    {};

  if (Array.isArray(variant.copyrightLines)) {
    const paragraphs = variant.copyrightLines
      .map(line => `  <p>${escapeHtml(line)}</p>`)
      .join("\n");
    return `${FOOTER_START}
<footer id="site-footer" data-footer-variant="${escapeHtml(variantName)}">
${paragraphs}
</footer>
${FOOTER_END}`;
  }

  const selectedLabels = new Set(variant.socialLinks || []);
  const links = (config.socialLinks || [])
    .filter(item => selectedLabels.has(item.label))
    .map(item => {
      const hover =
        variant.hoverIcons !== false && item.hoverIcon
          ? ` data-hover="${escapeHtml(item.hoverIcon)}"`
          : "";
      return `    <a href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(item.label)}"><img src="${escapeHtml(item.icon)}"${hover} alt="${escapeHtml(item.label)}" width="24" height="24" /></a>`;
    })
    .join("\n");

  return `${FOOTER_START}
<footer id="site-footer" data-footer-variant="${escapeHtml(variantName)}">
  <div class="social-icons">
${links}
  </div>
</footer>
${FOOTER_END}`;
}

function replaceGeneratedRegion(html, start, end, fallbackPattern, output) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end);

  if (startIndex >= 0 && endIndex > startIndex) {
    return `${html.slice(0, startIndex)}${output}${html.slice(endIndex + end.length)}`;
  }

  if (!fallbackPattern.test(html)) {
    return html;
  }

  return html.replace(fallbackPattern, output);
}

function embedRegistrationConfig(html) {
  const registration = config.registration || {};

  return html.replace(
    /(<section\b[^>]*\bid="registration-form"[^>]*)(>)/i,
    (_match, opening, closing) => {
      const cleaned = opening
        .replace(/\sdata-jet-form-url="[^"]*"/gi, "")
        .replace(/\sdata-minimum-height="[^"]*"/gi, "");
      return `${cleaned} data-jet-form-url="${escapeHtml(registration.jetFormUrl || "")}" data-minimum-height="${escapeHtml(registration.minimumHeight || 900)}"${closing}`;
    }
  );
}

const rootFiles = await readdir(projectRoot);
const pages = rootFiles.filter(file => file.endsWith(".html"));

for (const file of pages) {
  const filePath = path.join(projectRoot, file);
  let html = await readFile(filePath, "utf8");
  const hasSharedLayout =
    html.includes('id="header-placeholder"') ||
    html.includes(HEADER_START);

  if (!hasSharedLayout) {
    continue;
  }

  const currentPath = normalizePath(`/${file}`);
  const footerVariantMatch = html.match(
    /data-footer-variant="([^"]+)"/i
  );
  const footerVariant = footerVariantMatch?.[1] || "default";

  html = replaceGeneratedRegion(
    html,
    HEADER_START,
    HEADER_END,
    /<div\s+id="header-placeholder"\s*><\/div>/i,
    renderHeader(currentPath)
  );
  html = replaceGeneratedRegion(
    html,
    FOOTER_START,
    FOOTER_END,
    /<div\s+id="footer-placeholder"(?:\s+data-footer-variant="[^"]+")?\s*><\/div>/i,
    renderFooter(footerVariant)
  );
  html = embedRegistrationConfig(html);

  await writeFile(filePath, html, "utf8");
  console.log(`Rendered ${file}`);
}
