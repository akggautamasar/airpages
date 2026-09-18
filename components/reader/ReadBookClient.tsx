"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import Link from "next/link";
import { BookReader } from "@/components/reader/BookReader";
import { fetchBook, fetchReaderInfo, getDownloadUrl, getFileExt, type BackendBook } from "@/lib/backend";

export function ReadBookClient({ id }: { id: string }) {
  const [book, setBook] = useState<BackendBook | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [message, setMessage] = useState("Opening book…");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function load() {
      try {
        const nextBook = await fetchBook(id);
        if (cancelled) return;
        setBook(nextBook);
        const ext = getFileExt(nextBook.filename);

        if (ext === "PDF") {
          setStatus("ready");
          return;
        }

        async function poll() {
          try {
            const info = await fetchReaderInfo(id);
            if (cancelled) return;
            if (info.reader_status === "ready") {
              setStatus("ready");
              setMessage("");
              return;
            }
            if (info.reader_status === "failed" || info.reader_status === "unsupported") {
              setStatus(info.reader_status);
              setMessage(info.reader_error || "This book could not be prepared for browser reading.");
              return;
            }
            setStatus("converting");
            setMessage("Preparing this book for the immersive reader…");
            timer = setTimeout(poll, 2500);
          } catch {
            setStatus("error");
            setMessage("The book service could not be reached.");
          }
        }
        poll();
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Couldn’t find this book.");
        }
      }
    }

    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [id]);

  if (!book || status !== "ready") {
    return (
      <main className="air-read-loading">
        <Link href={book ? `/book/${book.id}` : "/"} className="back-link"><ArrowLeft size={15}/> Back to library</Link>
        <div className="loading-card">
          {status === "converting" || status === "loading" ? <Loader2 className="spin" size={28}/> : <span className="status-dot"/>}
          <h1>{book?.title || "AirPages"}</h1>
          <p>{message}</p>
          {book && (status === "failed" || status === "unsupported" || status === "error") && <a href={getDownloadUrl(book.id)} download><Download size={15}/> Download original</a>}
        </div>
        <style jsx>{`
          .air-read-loading{min-height:100vh;background:#090a0c;color:#eee;display:grid;place-items:center;align-content:center;gap:18px;padding:24px}.back-link{position:fixed;top:16px;left:16px;color:#8e8982;text-decoration:none;display:flex;gap:7px;align-items:center;font:11px DM Mono,monospace}.loading-card{width:min(500px,92vw);min-height:250px;border:1px solid rgba(255,255,255,.09);border-radius:18px;background:rgba(255,255,255,.035);display:grid;place-items:center;align-content:center;gap:10px;text-align:center;padding:28px}.loading-card h1{font:400 30px Georgia,serif;margin:5px 0}.loading-card p{color:#777;max-width:380px;line-height:1.6;margin:0}.loading-card a{display:inline-flex;gap:7px;align-items:center;color:#b17652;text-decoration:none}.spin{animation:spin 1s linear infinite}.status-dot{width:12px;height:12px;border-radius:50%;background:#b17652}@keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
      </main>
    );
  }

  return <main className="air-read"><BookReader book={book}/></main>;
}
