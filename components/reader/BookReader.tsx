"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from "pdfjs-dist";
import { ArrowLeft, Bookmark, BookmarkCheck, BookOpen, ChevronLeft, ChevronRight, Download, List, Maximize, Minus, Plus, Settings2, X } from "lucide-react";
import { getDownloadUrl, getFileExt, getReaderFileUrl, type BackendBook } from "@/lib/backend";
import { openEpub, readChapter } from "@/lib/epub";
import { PdfPage } from "./PdfPage";
import "./reader.css";

type Epub = Awaited<ReturnType<typeof openEpub>>;
type Panel = "Contents" | "Bookmarks" | "Reading settings";
type Theme = "Paper" | "Sepia" | "Night";

function readLocal(key: string) {
  try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch { return {}; }
}

function saveLocal(key: string, value: object) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function BookReader({ book }: { book: BackendBook }) {
  const originalFormat = getFileExt(book.filename);
  const format = originalFormat === "PDF" ? "PDF" : (book.reader_format || originalFormat).toUpperCase();
  const isPdf = format.includes("PDF");
  const url = originalFormat === "PDF" ? getDownloadUrl(book.id) : getReaderFileUrl(book.id);
  const key = "airpages:reader:" + book.id;
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [epub, setEpub] = useState<Epub>();
  const [chapter, setChapter] = useState<{ page: number; html: string; title?: string | null; turn?: "forward" | "back" }>();
  const [page, setPage] = useState(1);
  const [marks, setMarks] = useState<number[]>([]);
  const [theme, setTheme] = useState<Theme>("Paper");
  const [textMode, setTextMode] = useState(false);
  const [fit, setFit] = useState("page");
  const [zoom, setZoom] = useState(100);
  const [motion, setMotion] = useState(true);
  const [settingsReady, setSettingsReady] = useState(false);
  const [panel, setPanel] = useState<Panel>("Contents");
  const [entry, setEntry] = useState("1");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const shell = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const anchor = useRef("");
  const total = pdf?.numPages || epub?.chapters.length || 0;
  const unit = isPdf ? "Page" : "Chapter";

  useEffect(() => {
    const prefs = readLocal("airpages:reader-preferences");
    if (["Paper", "Sepia", "Night"].includes(prefs.theme)) setTheme(prefs.theme);
    if (prefs.fit === "width") setFit("width");
    setMotion(prefs.motion !== false);
    setSettingsReady(true);
  }, []);
  useEffect(() => {
    if (settingsReady) saveLocal("airpages:reader-preferences", { theme, fit, motion });
  }, [settingsReady, theme, fit, motion]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    let task: PDFDocumentLoadingTask | undefined;
    async function open() {
      setError("");
      let doc: PDFDocumentProxy | undefined, publication: Epub | undefined;
      if (isPdf) {
        const engine = await import("pdfjs-dist/legacy/build/pdf.mjs");
        if (!active) return;
        engine.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs?v=" + engine.version;
        task = engine.getDocument({ url, isEvalSupported: false });
        doc = await task.promise;
      } else {
        publication = await openEpub(url, controller.signal);
      }
      if (!active) return;
      const count = doc?.numPages || publication?.chapters.length || 1;
      const saved = readLocal(key);
      const savedPage = Number(saved.page);
      setPage(Number.isInteger(savedPage) ? Math.max(1, Math.min(count, savedPage)) : 1);
      setMarks(Array.isArray(saved.marks) ? saved.marks.filter((n: number) => Number.isInteger(n) && n > 0 && n <= count) : []);
      setZoom(Number.isInteger(saved.zoom) ? Math.max(60, Math.min(220, saved.zoom)) : 100);
      setPdf(doc);
      setEpub(publication);
    }
    open().catch(() => { if (active) setError("The book could not be opened. Try again or download the original."); });
    return () => { active = false; controller.abort(); void task?.destroy(); };
  }, [url, key, isPdf, retry]);

  useEffect(() => {
    if (total) saveLocal(key, { page, marks, zoom });
  }, [key, total, page, marks, zoom]);

  useEffect(() => {
    const node = viewport.current;
    if (!node) return;
    const observer = new ResizeObserver(([record]) => {
      const width = Math.floor(record.contentRect.width);
      const height = Math.floor(record.contentRect.height);
      setSize(old => old.width === width && old.height === height ? old : { width, height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    stage.current?.scrollTo(0, 0);
    setEntry(String(page));
    if (!epub) return;
    let active = true;
    readChapter(epub.zip, epub.chapters[page - 1]).then(result => {
      if (active) setChapter(previous => ({
        ...result, page,
        turn: previous && previous.page !== page ? (page > previous.page ? "forward" : "back") : undefined,
      }));
    }).catch(() => { if (active) setError("This chapter could not be opened."); });
    return () => { active = false; };
  }, [epub, page]);

  useEffect(() => {
    if (chapter && anchor.current) {
      document.getElementById("ap-anchor-" + anchor.current)?.scrollIntoView({ block: "start" });
      anchor.current = "";
    }
  }, [chapter]);

  const go = useCallback((target: number) => {
    if (!total || !Number.isInteger(target)) return;
    setPage(Math.max(1, Math.min(total, target)));
    dialog.current?.close();
  }, [total]);

  useEffect(() => {
    function navigate(e: KeyboardEvent) {
      if (dialog.current?.open || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey || (e.target instanceof HTMLElement && e.target.closest("input,select,textarea,[contenteditable]"))) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        go(page + (e.key === "ArrowRight" ? 1 : -1));
      }
    }
    window.addEventListener("keydown", navigate);
    return () => window.removeEventListener("keydown", navigate);
  }, [go, page]);

  function show(next: Panel) {
    setPanel(next);
    dialog.current?.showModal();
  }
  function restart() {
    setPdf(undefined); setEpub(undefined); setChapter(undefined); setError(""); setRetry(n => n + 1);
  }
  const marked = marks.includes(page);
  const currentTitle = epub && (epub.titles.get(epub.chapters[page - 1]) || (chapter?.page === page && chapter.title));
  return <div className="folio" data-theme={theme} data-motion={motion} ref={shell}>
    <header className="folio-head">
      <a href="/" aria-label="Back to library" title="Back to library"><ArrowLeft/></a>
      <div className="folio-identity"><small>AirPages · {isPdf ? "PDF" : "EPUB"}</small><h1>{book.title || book.filename}</h1></div>
      <button aria-label="Contents" title="Contents" onClick={() => show("Contents")}><List/></button>
      <button aria-label="Reading settings" title="Reading settings" onClick={() => show("Reading settings")}><Settings2/></button>
    </header>
    <div className="folio-viewport" ref={viewport}>
    <div className="folio-stage" ref={stage} aria-label="Book pages">
      {error ? <div className="folio-empty" role="alert"><BookOpen/><p>{error}</p><button onClick={restart}>Try again</button><a href={getDownloadUrl(book.id)}>Download original</a></div>
       : pdf ? <div className={textMode ? "folio-text-leaf" : "folio-leaf"}><PdfPage pdf={pdf} page={page} scale={zoom} fit={fit} textMode={textMode} {...size}/></div>
       : epub && chapter ? <article className="folio-prose" data-turn={chapter.turn} key={chapter.page} style={{ fontSize: (zoom / 100) * 1.2 + "rem" }} onClick={e => {
         const link = (e.target as Element).closest<HTMLAnchorElement>("a[data-path]");
         if (!link) return;
         e.preventDefault();
         const target = epub.chapters.indexOf(link.dataset.path || "") + 1;
         if (!target) return;
         const id = link.dataset.fragment || "";
         if (target === page) document.getElementById("ap-anchor-" + id)?.scrollIntoView();
         else { anchor.current = id; go(target); }
       }} dangerouslySetInnerHTML={{ __html: chapter.html }}/>
       : <div className="folio-empty" role="status"><BookOpen/><p>{epub ? "Opening chapter…" : "Opening your book…"}</p></div>}
    </div>
    </div>
    <footer className="folio-foot">
      <progress value={total ? page : 0} max={total || 1} aria-label="Reading progress"/>
      <div className="folio-tools">
        <div className="folio-group"><button disabled={!total} aria-label={marked ? "Remove bookmark" : "Bookmark this location"} aria-pressed={marked} title={marked ? "Remove bookmark" : "Bookmark this location"} onClick={() => setMarks(values => marked ? values.filter(p => p !== page) : [...values, page].sort((a,b) => a-b))}>{marked ? <BookmarkCheck/> : <Bookmark/>}</button>
        <button className="bookmark-list" onClick={() => show("Bookmarks")}>Bookmarks</button></div>
        <div className="folio-group"><button aria-label="Previous page" disabled={page <= 1} onClick={() => go(page - 1)}><ChevronLeft/></button>
        <button className="folio-location" onClick={() => show("Contents")} aria-label={unit + " " + page + " of " + total + ". Jump to location"}>{page} / {total || "…"}</button>
        <button aria-label="Next page" disabled={page >= total} onClick={() => go(page + 1)}><ChevronRight/></button></div>
        <div className="folio-group zoom-tools"><button aria-label="Zoom out" disabled={zoom <= 60} onClick={() => setZoom(z => Math.max(60, z - 20))}><Minus/></button><span>{zoom}%</span><button aria-label="Zoom in" disabled={zoom >= 220} onClick={() => setZoom(z => Math.min(220, z + 20))}><Plus/></button></div>
      </div>
    </footer>
    <dialog className="folio-panel" ref={dialog} aria-labelledby="folio-panel-title" onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      <div className="folio-panel-inner"><div className="panel-title"><h2 id="folio-panel-title">{panel}</h2><button aria-label="Close panel" onClick={() => dialog.current?.close()}><X/></button></div>
      <div className="folio-tabs">{(["Contents", "Bookmarks", "Reading settings"] as Panel[]).map(name => <button aria-pressed={panel === name} key={name} onClick={() => setPanel(name)}>{name === "Reading settings" ? "Settings" : name}</button>)}</div>
      {panel === "Contents" && <><form className="folio-jump" onSubmit={e => { e.preventDefault(); go(Number(entry)); }}>
        <label htmlFor="folio-page">Go to {unit.toLowerCase()}</label><input required type="number" min="1" max={total || 1} id="folio-page" value={entry} onChange={e => setEntry(e.target.value)}/><button disabled={!total}>Go</button>
      </form>{currentTitle && <p>Reading {currentTitle}</p>}{epub && <ol>{epub.chapters.map((path,i) => <li key={i}><button aria-current={i + 1 === page ? "location" : undefined} onClick={() => go(i + 1)}>{epub.titles.get(path) || "Chapter " + (i + 1)}</button></li>)}</ol>}</>}
      {panel === "Bookmarks" && (marks.length ? <ol>{marks.map(p => <li key={p}><button onClick={() => go(p)}>{unit} {p}</button></li>)}</ol> : <p>Use the bookmark beside the page controls to save a place on this device.</p>)}
      {panel === "Reading settings" && <>
        <fieldset><legend>Reading theme</legend>{(["Paper","Sepia","Night"] as Theme[]).map(t => <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t}</button>)}</fieldset>
        {isPdf && <fieldset><legend>PDF view</legend><button aria-pressed={!textMode} onClick={() => setTextMode(false)}>Original page</button><button aria-pressed={textMode} onClick={() => setTextMode(true)}>Selectable text</button></fieldset>}
        {isPdf && !textMode && <fieldset><legend>Page fit</legend>{["page","width"].map(f => <button key={f} aria-pressed={fit === f} onClick={() => { setFit(f); setZoom(100); }}>Fit {f}</button>)}</fieldset>}
        <label className="folio-check"><input type="checkbox" checked={motion} onChange={e => setMotion(e.target.checked)}/> Animate page turns</label>
        <div className="folio-utilities"><a href={getDownloadUrl(book.id)} download><Download/> Download original</a>
        {typeof document !== "undefined" && document.fullscreenEnabled && <button onClick={async () => { dialog.current?.close(); try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.current?.requestFullscreen(); } catch {} }}><Maximize/> Fullscreen</button>}</div>
      </>}
      </div>
    </dialog>
  </div>;
}
