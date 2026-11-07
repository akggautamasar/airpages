"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export function PdfPage({ pdf, page, scale, fit, width, height, textMode }: {
  pdf: PDFDocumentProxy; page: number; scale: number; fit: string; textMode: boolean; width: number; height: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    if (!width || !height) return;
    let active = true;
    let task: RenderTask | undefined;
    setBusy(true);
    setError("");
    async function draw() {
      const source = await pdf.getPage(page);
      if (!active) return;
      if (textMode) {
        const content = await source.getTextContent();
        const words = content.items.flatMap(item => "str" in item ? [item.str + (item.hasEOL ? "\n" : " ")] : []);
        if (active) setText(words.join("").trim());
        return;
      }
      const base = source.getViewport({ scale: 1 });
      const fitScale = fit === "width" ? width / base.width : Math.min(width / base.width, height / base.height);
      const viewport = source.getViewport({ scale: fitScale * scale / 100 });
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8000000 / (viewport.width * viewport.height)), 8192 / Math.max(viewport.height,viewport.width));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width * ratio));
      canvas.height = Math.max(1, Math.round(viewport.height * ratio));
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", "Page " + page);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      task = source.render({ canvasContext: ctx, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (active) mount.current?.replaceChildren(canvas);
    }
    draw().catch(() => { if (active) setError("This page could not be rendered."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; task?.cancel(); };
  }, [pdf, page, scale, fit, width, height, textMode]);
  if (textMode) return <article className="folio-prose folio-extract" style={{ fontSize: (scale / 100) * 1.2 + "rem" }}>
    {busy ? "Reading page text…" : error || text || "This page has no embedded text. Choose Original page in Reading settings to see the scan."}
  </article>;
  return <><div ref={mount} className="folio-canvas" aria-busy={busy} hidden={!!error}/>{busy && <span className="folio-status" role="status">Rendering page…</span>}{error && <p role="alert">{error}</p>}</>;
}
