import type JSZip from "jszip";

function archivePath(base: string, href: string) {
  const url = new URL(href, "https://epub.invalid/" + base);
  if (url.origin !== "https://epub.invalid") return "";
  return decodeURIComponent(url.pathname.slice(1));
}

export async function openEpub(url: string, signal: AbortSignal) {
  const Zip = (await import("jszip")).default;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("The EPUB download failed.");
  const zip = await Zip.loadAsync(await response.arrayBuffer());
  const parser = new DOMParser();
  async function xml(path: string) {
    const raw = await zip.file(path)?.async("string");
    if (!raw) throw new Error("The EPUB package is incomplete.");
    return parser.parseFromString(raw, "application/xml");
  }
  const container = await xml("META-INF/container.xml");
  const root = container.querySelector("rootfile")?.getAttribute("full-path") || "";
  const opf = await xml(root);
  const manifest = new Map<string, string>();
  for (const item of opf.querySelectorAll("manifest item")) {
    manifest.set(item.id, archivePath(root, item.getAttribute("href") || ""));
  }
  const chapters = [...opf.querySelectorAll("spine itemref")].map(item => manifest.get(item.getAttribute("idref") || ""))
    .filter((path): path is string => !!path && !!zip.file(path));
  if (!chapters.length) throw new Error("This EPUB has no readable chapters.");
  const titles = new Map<string, string>();
  const nav = opf.querySelector('item[properties~="nav"]');
  const toc = nav?.id || opf.querySelector("spine")?.getAttribute("toc");
  const tocPath = toc && manifest.get(toc);
  if (tocPath) {
    const navigation = await xml(tocPath);
    for (const item of navigation.querySelectorAll(nav ? "nav a[href]" : "navPoint")) {
      const href = nav ? item.getAttribute("href") : item.querySelector("content")?.getAttribute("src");
      const label = (nav ? item : item.querySelector("navLabel"))?.textContent?.trim();
      if (href && label) {
        const path = archivePath(tocPath, href);
        if (!titles.has(path)) titles.set(path, label);
      }
    }
  }
  return { zip, chapters, titles };
}

export async function readChapter(zip: JSZip, path: string) {
  const raw = await zip.file(path)?.async("string");
  if (!raw) throw new Error("This chapter could not be opened.");
  const doc = new DOMParser().parseFromString(raw, "text/html");
  // Rebuild the chapter using book typography. Only packaged illustrations
  // and in-book links are carried into the reader.
  doc.querySelectorAll("script,style,link,iframe,object,embed,form,template").forEach(el => el.remove());
  const allowed = new Set("a abbr article aside b blockquote br caption cite code dd div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img li main ol p pre q ruby rt section small span strong sub sup table tbody td th thead tr u ul".split(" "));
  for (const el of [...doc.body.querySelectorAll("*")]) {
    if (!allowed.has(el.localName) || el.namespaceURI !== "http://www.w3.org/1999/xhtml") {
      el.replaceWith(...el.childNodes);
      continue;
    }
    const src = el.getAttribute("src"), alt = el.getAttribute("alt"), href = el.getAttribute("href"), id = el.id;
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
    if (id) el.id = "ap-anchor-" + id;
    if (el.localName === "a" && href && !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) {
      el.setAttribute("href", "#");
      el.setAttribute("data-path", archivePath(path, href));
      el.setAttribute("data-fragment", decodeURIComponent(href.split("#")[1] || ""));
    }
    if (el.localName === "img" && src) {
      const file = zip.file(archivePath(path, src));
      const mime = file && /\.(png|jpe?g|gif|webp|svg)$/i.exec(file.name)?.[1].toLowerCase();
      if (file && mime) {
        const type = mime === "svg" ? "svg+xml" : mime === "jpg" ? "jpeg" : mime;
        el.setAttribute("src", "data:image/" + type + ";base64," + await file.async("base64"));
      }
      el.setAttribute("alt", alt || "");
    }
  }
  return { html: doc.body.innerHTML, title: doc.querySelector("h1,h2,h3")?.textContent?.trim() };
}
