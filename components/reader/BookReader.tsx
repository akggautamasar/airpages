"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { ChevronLeft, ChevronRight, Download, List, Loader2, Maximize2, Minus, Plus } from "lucide-react";
import { getDownloadUrl, getFileExt, getReaderFileUrl, type BackendBook } from "@/lib/backend";

type EpubChapter = { title: string; html: string };
type Props = { book: BackendBook };

function safeEpubHtml(input: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "text/html");
  doc.querySelectorAll("script,iframe,object,embed,form,video,audio").forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      if (/^on/i.test(attr.name) || /javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    });
  });
  return doc.body?.innerHTML || "";
}

async function loadPdf(url: string) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;
  return pdfjs.getDocument({ url, withCredentials: false }).promise;
}

export function BookReader({ book }: Props) {
  const ext = getFileExt(book.filename);
  const fileUrl = ext === "PDF" ? getDownloadUrl(book.id) : getReaderFileUrl(book.id);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(book.page_count || book.pages || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [chapterHtml, setChapterHtml] = useState("");
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [fontSize, setFontSize] = useState(100);
  const [tocOpen, setTocOpen] = useState(false);
  const [tilt, setTilt] = useState({ x: -1.5, y: -4 });
  const [fullscreen, setFullscreen] = useState(false);
  const [turn, setTurn] = useState<"idle" | "next" | "prev">("idle");
  const turnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const isPdf = ext === "PDF";
  const isEpub = ext === "EPUB";
  const title = book.title || book.filename;

  const renderPdfPage = useCallback(async (pdf: any, pageNumber: number) => {
    setLoading(true);
    setError(null);
    const pdfPage = await pdf.getPage(pageNumber);
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const maxWidth = Math.min(window.innerWidth < 760 ? window.innerWidth - 38 : 820, 900);
    const scale = Math.max(0.6, Math.min(2.0, maxWidth / baseViewport.width));
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Could not create PDF canvas");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    setImageUrl(canvas.toDataURL("image/jpeg", 0.94));
    setChapterHtml("");
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function initPdf() {
      if (!isPdf) return;
      setLoading(true);
      try {
        const pdf = await loadPdf(fileUrl);
        if (cancelled) return;
        setTotal(pdf.numPages);
        await renderPdfPage(pdf, page);
        (window as any).__airpagesPdf = pdf;
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || "Could not open this PDF."); setLoading(false); }
      }
    }
    initPdf();
    return () => { cancelled = true; };
  }, [fileUrl, isPdf, renderPdfPage]);

  useEffect(() => {
    let cancelled = false;
    async function initEpub() {
      if (!isEpub) return;
      setLoading(true);
      setError(null);
      try {
        const JSZip = (await import("jszip")).default;
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to load EPUB (${response.status})`);
        const zip = await JSZip.loadAsync(await response.arrayBuffer());
        const container = await zip.file("META-INF/container.xml")?.async("string");
        if (!container) throw new Error("Invalid EPUB: missing container.xml");
        const parser = new DOMParser();
        const containerDoc = parser.parseFromString(container, "text/xml");
        const opfPath = containerDoc.querySelector("rootfile")?.getAttribute("full-path");
        if (!opfPath) throw new Error("Invalid EPUB: package path missing");
        const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
        const opf = await zip.file(opfPath)?.async("string");
        if (!opf) throw new Error("Invalid EPUB: package file missing");
        const opfDoc = parser.parseFromString(opf, "text/xml");
        const manifest = new Map<string, string>();
        opfDoc.querySelectorAll("manifest item").forEach((item) => {
          const id = item.getAttribute("id");
          const href = item.getAttribute("href");
          if (id && href) manifest.set(id, href);
        });
        const paths: string[] = [];
        opfDoc.querySelectorAll("spine itemref").forEach((ref) => {
          const id = ref.getAttribute("idref");
          const href = id ? manifest.get(id) : null;
          if (href) paths.push(baseDir + href);
        });
        if (!paths.length) throw new Error("This EPUB has no readable chapters.");

        const loaded: EpubChapter[] = [];
        for (let i = 0; i < paths.length; i++) {
          const path = paths[i];
          const raw = await zip.file(path)?.async("string");
          if (!raw) continue;
          const chapterDoc = parser.parseFromString(raw, "text/html");
          const chapterDir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
          for (const img of [...chapterDoc.querySelectorAll("img[src]")]) {
            const src = img.getAttribute("src") || "";
            if (/^(data:|https?:|#)/i.test(src)) continue;
            const clean = decodeURIComponent(src.split("#")[0].split("?")[0]);
            const imgFile = zip.file(chapterDir + clean);
            if (!imgFile) continue;
            const bytes = await imgFile.async("base64");
            const type = /\.png$/i.test(clean) ? "image/png" : /\.svg$/i.test(clean) ? "image/svg+xml" : /\.webp$/i.test(clean) ? "image/webp" : "image/jpeg";
            img.setAttribute("src", `data:${type};base64,${bytes}`);
          }
          for (const link of [...chapterDoc.querySelectorAll('link[rel="stylesheet"]')]) {
            const href = link.getAttribute("href") || "";
            const cssFile = zip.file(chapterDir + decodeURIComponent(href.split("?")[0]));
            if (cssFile) {
              const style = chapterDoc.createElement("style");
              style.textContent = (await cssFile.async("string")).replace(/@font-face\\s*\\{[^}]*\\}/gi, "");
              chapterDoc.head.appendChild(style);
            }
            link.remove();
          }
          const heading = chapterDoc.querySelector("h1,h2,h3")?.textContent?.trim();
          loaded.push({ title: heading || path.split("/").pop()?.replace(/\\.(x?html?)$/i, "") || `Chapter ${i + 1}`, html: safeEpubHtml(chapterDoc.documentElement.outerHTML) });
        }
        if (cancelled) return;
        setChapters(loaded);
        setTotal(loaded.length);
        setPage(1);
        setChapterHtml(loaded[0]?.html || "");
        setImageUrl(null);
        setLoading(false);
      } catch (e: any) {
        if (!cancelled) { setError(e?.message || "Could not open this EPUB."); setLoading(false); }
      }
    }
    initEpub();
    return () => { cancelled = true; };
  }, [fileUrl, isEpub]);

  useEffect(() => {
    if (!isPdf || page < 1) return;
    const pdf = (window as any).__airpagesPdf;
    if (pdf) renderPdfPage(pdf, page).catch((e: any) => setError(e?.message || "Could not render page."));
  }, [page, isPdf, renderPdfPage]);

  useEffect(() => {
    if (isEpub && chapters.length) setChapterHtml(chapters[page - 1]?.html || "");
  }, [page, chapters, isEpub]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 5, y: -x * 7 });
  };

  const resetTilt = () => setTilt({ x: -1.5, y: -4 });
  const changePage = (direction: "next" | "prev") => {
    if (turn !== "idle" || !total) return;
    const target = direction === "next" ? Math.min(total, page + 1) : Math.max(1, page - 1);
    if (target === page) return;
    setTurn(direction);
    turnTimer.current = setTimeout(() => {
      setPage(target);
      requestAnimationFrame(() => requestAnimationFrame(() => setTurn("idle")));
    }, 300);
  };
  const prev = () => changePage("prev");
  const next = () => changePage("next");

  useEffect(() => () => {
    if (turnTimer.current) clearTimeout(turnTimer.current);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {}
  };

  const paperStyle = useMemo(() => ({
    transform: `perspective(1800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateZ(-0.35deg)`,
  }), [tilt]);

  if (error) {
    return <div className="reader-error"><p>{error}</p><a href={getDownloadUrl(book.id)} download>Download the original file</a></div>;
  }

  return (
    <div className="air-reader">
      <div className="air-reader-top">
        <div className="reader-title"><span className="reader-kicker">{ext} · AIRPAGES</span><strong>{title}</strong></div>
        <div className="reader-actions">
          {isEpub && <button onClick={() => setTocOpen((v) => !v)} aria-label="Contents"><List size={17}/></button>}
          <button onClick={() => setFontSize((s) => Math.max(70, s - 10))} aria-label="Smaller text"><Minus size={16}/></button>
          <span>{fontSize}%</span>
          <button onClick={() => setFontSize((s) => Math.min(180, s + 10))} aria-label="Larger text"><Plus size={16}/></button>
          <a href={getDownloadUrl(book.id)} download aria-label="Download"><Download size={17}/></a>
          <button onClick={toggleFullscreen} aria-label="Fullscreen"><Maximize2 size={17}/></button>
        </div>
      </div>

      <div className="reader-stage" ref={stageRef} onPointerMove={onPointerMove} onPointerLeave={resetTilt}>
        <div className="paper-shadow" />
        <article className={`reader-paper ${isEpub ? "epub-paper" : "pdf-paper"} paper-turn-${turn}`} style={paperStyle}>
          <div className="paper-inner">
            {loading ? <div className="reader-loading"><Loader2 className="spin" size={28}/><span>Preparing {ext}…</span></div> :
             isPdf && imageUrl ? <img src={imageUrl} alt={`Page ${page} of ${title}`} /> :
             isEpub ? <div className="epub-content" style={{ fontSize: `${fontSize}%` }} dangerouslySetInnerHTML={{ __html: chapterHtml }} /> :
             null}
          </div>
          <div className="paper-edge" />
        </article>

        {tocOpen && isEpub && <aside className="reader-toc"><div className="toc-head"><b>Contents</b><button onClick={() => setTocOpen(false)}>×</button></div>{chapters.map((chapter, i) => <button key={i} className={i + 1 === page ? "active" : ""} onClick={() => { setPage(i + 1); setTocOpen(false); }}>{chapter.title}</button>)}</aside>}
      </div>

      <div className="reader-bottom">
        <button onClick={prev} disabled={page <= 1 || turn !== "idle"}><ChevronLeft size={18}/></button>
        <span>{page} / {total || "—"}</span>
        <button onClick={next} disabled={page >= (total || 1) || turn !== "idle"}><ChevronRight size={18}/></button>
        <div className="progress"><i style={{ width: `${total ? (page / total) * 100 : 0}%` }}/></div>
      </div>

      <style jsx>{`
        .air-reader{height:100%;min-height:100%;display:flex;flex-direction:column;background:#090a0c;color:#eee}
        .air-reader-top{height:58px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 14px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(10,10,12,.86);backdrop-filter:blur(16px);z-index:5}
        .reader-title{min-width:0;display:flex;flex-direction:column;gap:2px}.reader-title strong{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:55vw}.reader-kicker{font:500 8px/1 DM Mono,monospace;letter-spacing:.16em;color:#8b857c}
        .reader-actions{display:flex;align-items:center;gap:4px}.reader-actions button,.reader-actions a{height:32px;min-width:32px;padding:0 8px;border:1px solid rgba(255,255,255,.08);border-radius:8px;background:rgba(255,255,255,.04);color:#aaa;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}.reader-actions span{font:10px DM Mono,monospace;color:#777;min-width:34px;text-align:center}
        .reader-stage{position:relative;flex:1;min-height:0;overflow:hidden;display:grid;place-items:center;padding:28px;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.08),transparent 35%),linear-gradient(145deg,#0d0e11,#050506);touch-action:pan-y}
        .reader-paper{position:relative;width:min(72vw,780px);height:min(82vh,900px);max-height:calc(100% - 20px);background:#f5f0e7;color:#211f1b;border:1px solid rgba(255,255,255,.32);border-radius:3px 11px 10px 4px;overflow:hidden;transform-origin:center right;transition:transform .28s cubic-bezier(.2,.7,.2,1),box-shadow .28s ease;transform-style:preserve-3d;backface-visibility:hidden;will-change:transform;box-shadow:28px 34px 80px rgba(0,0,0,.52),8px 10px 25px rgba(0,0,0,.22),inset 0 0 0 1px rgba(65,51,38,.12)}
        .reader-paper:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,.5),transparent 9%,transparent 89%,rgba(35,25,17,.11)),radial-gradient(ellipse at 35% 20%,rgba(255,255,255,.55),transparent 45%);z-index:2;mix-blend-mode:soft-light}
        .reader-paper.paper-turn-next{animation:airPaperNext .62s cubic-bezier(.22,.72,.2,1) both}
.reader-paper.paper-turn-prev{animation:airPaperPrev .62s cubic-bezier(.22,.72,.2,1) both;transform-origin:center left}
@keyframes airPaperNext{
  0%{transform:perspective(1800px) rotateX(0deg) rotateY(0deg) rotateZ(-.35deg) translateX(0);filter:brightness(1)}
  42%{transform:perspective(1800px) rotateX(1deg) rotateY(-82deg) rotateZ(-1deg) translateX(8px);filter:brightness(.78)}
  50%{transform:perspective(1800px) rotateX(1deg) rotateY(-92deg) rotateZ(-1deg) translateX(10px);filter:brightness(.7)}
  100%{transform:perspective(1800px) rotateX(0deg) rotateY(0deg) rotateZ(-.35deg) translateX(0);filter:brightness(1)}
}
@keyframes airPaperPrev{
  0%{transform:perspective(1800px) rotateX(0deg) rotateY(0deg) rotateZ(-.35deg) translateX(0);filter:brightness(1)}
  42%{transform:perspective(1800px) rotateX(1deg) rotateY(82deg) rotateZ(1deg) translateX(-8px);filter:brightness(.78)}
  50%{transform:perspective(1800px) rotateX(1deg) rotateY(92deg) rotateZ(1deg) translateX(-10px);filter:brightness(.7)}
  100%{transform:perspective(1800px) rotateX(0deg) rotateY(0deg) rotateZ(-.35deg) translateX(0);filter:brightness(1)}
}
.paper-inner{position:absolute;inset:0;overflow:auto;padding:28px}.pdf-paper .paper-inner{display:grid;place-items:center;padding:22px}.pdf-paper img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;box-shadow:0 5px 18px rgba(0,0,0,.08)}
        .epub-content{height:100%;overflow:auto;padding:22px 34px;font-family:Georgia,serif;line-height:1.72}.epub-content img{max-width:100%;height:auto}.epub-content h1,.epub-content h2,.epub-content h3{line-height:1.15}.epub-content p{margin:0 0 1em}.epub-content a{color:#80553d}
        .paper-edge{position:absolute;right:0;top:0;bottom:0;width:11px;background:linear-gradient(90deg,transparent,rgba(44,32,22,.12));pointer-events:none;z-index:3;transform:translateZ(2px)}
.reader-paper:after{content:"";position:absolute;inset:0;pointer-events:none;border-radius:inherit;box-shadow:inset -12px 0 22px rgba(42,29,20,.08),inset 0 -8px 18px rgba(42,29,20,.04);z-index:4}
.reader-paper.paper-turn-next .paper-edge,.reader-paper.paper-turn-prev .paper-edge{opacity:.8}
        .paper-shadow{position:absolute;width:min(70vw,760px);height:60px;bottom:8%;background:rgba(0,0,0,.5);filter:blur(28px);transform:rotate(-1deg);border-radius:50%}
        .reader-loading{height:100%;display:grid;place-items:center;align-content:center;gap:10px;color:#7d756d;font:11px DM Mono,monospace;text-transform:uppercase;letter-spacing:.12em}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
        .reader-bottom{height:48px;display:flex;align-items:center;justify-content:center;gap:8px;border-top:1px solid rgba(255,255,255,.08);background:#090a0c}.reader-bottom button{height:30px;width:32px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.04);color:#aaa}.reader-bottom button:disabled{opacity:.25}.reader-bottom span{font:10px DM Mono,monospace;color:#777;min-width:64px;text-align:center}.progress{width:min(220px,25vw);height:2px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden}.progress i{display:block;height:100%;background:#b17652}
        .reader-toc{position:absolute;left:16px;top:16px;bottom:16px;width:min(330px,82vw);background:rgba(17,17,19,.96);border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 25px 80px rgba(0,0,0,.45);z-index:10;overflow:auto}.toc-head{display:flex;align-items:center;justify-content:space-between;padding:14px;border-bottom:1px solid rgba(255,255,255,.08)}.toc-head button{background:none;border:0;color:#aaa;font-size:20px}.reader-toc>button{display:block;width:100%;padding:11px 14px;text-align:left;background:none;border:0;color:#999;font-size:12px}.reader-toc>button.active,.reader-toc>button:hover{background:rgba(177,118,82,.12);color:#eee}
        .reader-error{height:100%;display:grid;place-items:center;align-content:center;gap:12px;background:#090a0c;color:#999;padding:30px;text-align:center}.reader-error a{color:#b17652}
        @media(max-width:760px){.air-reader-top{height:54px}.reader-actions span{display:none}.reader-stage{padding:10px}.reader-paper{width:94vw;height:78vh;max-height:none}.epub-content{padding:18px 20px;font-size:15px}.paper-shadow{bottom:9%;width:82vw}.reader-bottom{height:44px}.progress{width:25vw}}
      `}</style>
    </div>
  );
}
