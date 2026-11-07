"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Library, List, Search, X } from "lucide-react";
import { getLibraryCoverUrl, type LibraryBook } from "@/lib/library";

const cloth = ["#994c36", "#3f675b", "#30465e", "#805461", "#685038", "#566b78", "#494d34", "#7c3841"];
const ornaments = ["✺", "❧", "✥", "✧"];

function binding(book: LibraryBook) {
  const seed = Array.from(book.id).reduce((n, letter) => (n * 31 + letter.charCodeAt(0)) >>> 0, 7);
  return { "--cloth": cloth[seed % cloth.length], "--height": (205 + seed % 65) + "px", "--width": (38 + seed % 17) + "px" } as CSSProperties;
}

function subjects(book: LibraryBook) {
  return Array.isArray(book.tags) ? book.tags.filter(tag => typeof tag === "string" && tag.trim()) : [];
}

function BookFace({ book, index }: { book: LibraryBook; index: number }) {
  const [failed, setFailed] = useState(false);
  return <span className="cloth-face" style={binding(book)}>
    <span className="face-frame"><small>AIRPAGES</small><b>{book.title}</b>
      <i aria-hidden="true">{ornaments[index % ornaments.length]}</i><small>{book.author}</small></span>
    {book.cover_message_id && !failed ? <img src={getLibraryCoverUrl(book.id, book.updated_at)} alt="" loading="lazy" onError={() => setFailed(true)} /> : null}
  </span>;
}

export function LibraryShelf({ books, total, notice }: { books: LibraryBook[]; total: number; notice: string }) {
  const [collection, setCollection] = useState(books);
  const [offset, setOffset] = useState(books.length);
  const [available, setAvailable] = useState(total);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [view, setView] = useState<"shelf" | "list">("shelf");
  const [selected, setSelected] = useState<LibraryBook | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [scrollable, setScrollable] = useState({ back: false, next: false });
  const categories = useMemo(() => [...new Set(collection.flatMap(subjects))].sort(), [collection]);
  const filtered = useMemo(() => collection.filter(book =>
    (!subject || subjects(book).includes(subject)) &&
    [book.title, book.author, ...subjects(book)].join(" ").toLowerCase().includes(query.trim().toLowerCase())
  ), [collection, query, subject]);

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    node.scrollLeft = 0;
    const measure = () => setScrollable({ back: node.scrollLeft > 2, next: node.scrollLeft + node.clientWidth < node.scrollWidth - 2 });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    node.addEventListener("scroll", measure, { passive: true });
    measure();
    return () => { observer.disconnect(); node.removeEventListener("scroll", measure); };
  }, [filtered, view]);

  async function loadMore() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/library?offset=" + offset);
      if (!response.ok) throw new Error();
      const page: { books: LibraryBook[]; total: number } = await response.json();
      const known = new Set(collection.map(book => book.id));
      const additions = page.books.filter(book => !known.has(book.id));
      setCollection([...collection, ...additions]);
      setOffset(offset + page.books.length);
      setAvailable(additions.length ? page.total : offset);
    } catch {
      setLoadError("Couldn’t load more volumes. Please try again.");
    } finally { setLoading(false); }
  }

  function move(direction: number) {
    const node = rail.current;
    if (node) node.scrollBy({ left: direction * node.clientWidth * .8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <main className="archive">
    <header className="mast"><a href="/" className="mast-brand"><BookOpen size={22} /> AirPages</a>
      <a href="#collection">Browse collection <span aria-hidden="true">↓</span></a></header>
    <section className="archive-intro">
      <div className="catalog-label"><span aria-hidden="true">✳</span> The digital reading room</div>
      <h1>Welcome to <em>the library.</em></h1>
      <p className="volume-count">{Math.max(collection.length, available)} {Math.max(collection.length, available) === 1 ? "volume" : "volumes"} in the collection</p>
      <label className="archive-search"><Search size={19} /><input type="search" aria-label="Search by title, author or subject" placeholder="Find a title, author or subject…" value={query} onChange={e => setQuery(e.target.value)} /></label>
      {categories.length > 0 && <div className="filters" aria-label="Subjects">
        <button aria-pressed={!subject} onClick={() => setSubject("")}>All subjects</button>
        {categories.slice(0, 6).map(tag => <button key={tag} aria-pressed={subject === tag} onClick={() => setSubject(tag)}>{tag}</button>)}
        {categories.length > 6 && <select aria-label="More subjects" value={categories.slice(6).includes(subject) ? subject : ""} onChange={e => setSubject(e.target.value)}><option value="">More subjects</option>{categories.slice(6).map(tag => <option key={tag}>{tag}</option>)}</select>}
      </div>}
    </section>
    <section id="collection" className="collection">
      <div className="shelf-heading"><h2>The collection</h2><div className="view-switch">
        <button aria-pressed={view === "shelf"} onClick={() => setView("shelf")}><Library size={15}/> Shelf</button>
        <button aria-pressed={view === "list"} onClick={() => setView("list")}><List size={15}/> List</button></div></div>
      {notice && <p className="service-note">{notice} <a href="/">Refresh catalogue</a></p>}
      {filtered.length ? view === "shelf" ? <div className="bookcase">
        <div className="shelf-scroll" ref={rail}><div className={'book-row' + (filtered.length <= 6 ? ' face-out' : '')}>
          {filtered.map((book, i) => <button className="bound-book" key={book.id} style={binding(book)} onClick={() => setSelected(book)} aria-label={[book.title, book.author].filter(Boolean).join(" by ")}>
            {filtered.length <= 6 ? <BookFace book={book} index={i}/> : <span className="bound-spine">
              {book.cover_message_id ? <img loading="lazy" src={getLibraryCoverUrl(book.id, book.updated_at)} alt="" onError={e => { e.currentTarget.hidden = true; }} /> : null}
              <i aria-hidden="true">{ornaments[i % 4]}</i><b>{book.title}</b><small>{book.author}</small></span>}
          </button>)}
        </div></div><div className="ledge" />
      </div> : <div className="index-list">{filtered.map((book, i) => <button key={book.id} onClick={() => setSelected(book)}>
        <span className="index-mark" style={binding(book)}>{ornaments[i % 4]}</span><span><b>{book.title}</b><small>{book.author || "Author unlisted"}</small></span><ArrowRight size={17}/></button>)}</div>
      : <div className="no-results"><h3>No matching volumes</h3><button onClick={() => { setSubject(""); setQuery(""); }}>Clear search and filters</button></div>}
      <footer className="shelf-foot"><span role="status">{filtered.length} shown{available > offset ? " · " + offset + " loaded" : ""}</span>
        {view === "shelf" && (scrollable.back || scrollable.next) && <div><button aria-label="Scroll shelf left" disabled={!scrollable.back} onClick={() => move(-1)}><ArrowLeft size={16}/></button><button aria-label="Scroll shelf right" disabled={!scrollable.next} onClick={() => move(1)}><ArrowRight size={16}/></button></div>}
        {available > offset && <button onClick={loadMore} disabled={loading}>{loading ? "Loading…" : "Load more volumes"}</button>}
      </footer>{loadError && <p role="alert">{loadError}</p>}
    </section>
    <dialog ref={dialog} className="volume-dialog" aria-labelledby="volume-title" onClose={() => setSelected(null)} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      {selected && <div className="volume-details"><button autoFocus className="dismiss" aria-label="Close book details" onClick={() => dialog.current?.close()}><X size={19}/></button>
        <BookFace key={selected.id} book={selected} index={0}/><div><span className="catalog-label">{subjects(selected)[0] || "From the collection"}</span><h2 id="volume-title">{selected.title}</h2><p>{selected.author}</p>
        <Link className="read-link" href={"/read/" + encodeURIComponent(selected.id)}>Open reader <ArrowRight size={16}/></Link></div></div>}
    </dialog>
  </main>;
}
