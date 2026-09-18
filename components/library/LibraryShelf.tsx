"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import type { LibraryBook } from "@/lib/library";
import { getLibraryCoverUrl } from "@/lib/library";

const variants=[
  ["#d9e4d8","#6e9278","#263f31","#f7f2e8"],["#d8d7d1","#737b78","#303633","#f7f3ea"],
  ["#7695b3","#2f4c69","#182735","#f6f1e8"],["#e0d8d0","#a23f31","#591d17","#fbf3e8"],
  ["#59725f","#2f5538","#17271b","#f6f0e2"],["#efc3b9","#bd877b","#633e36","#fff8f3"],
  ["#3e5e9e","#1e3658","#101e36","#ffe078"],["#bd5d4d","#591d16","#2b0d0a","#faf4e9"],
  ["#49a3a1","#277876","#124a49","#f4fbf7"],["#942c37","#510f16","#25070b","#f7ebd6"],
  ["#c09e77","#7b542f","#3a2515","#f8f0e3"],["#377fb3","#245978","#102f45","#fff"],
];

function hash(v:string){let n=17;for(let i=0;i<v.length;i++)n=(n*31+v.charCodeAt(i))|0;return Math.abs(n)}
function dims(book:LibraryBook,seed:number){const p=book.page_count??book.pages??0;return{w:Math.max(19,Math.min(46,Math.round((p||320)*.045+((seed%9)-4)*.7))),h:Math.max(205,Math.min(285,Math.round((p||320)*.095+245+((seed>>3)%13))))}}

function Spine({book,index,onOpen}:{book:LibraryBook;index:number;onOpen:(book:LibraryBook,el:HTMLButtonElement)=>void}){
  const [hover,setHover]=useState(false),[failed,setFailed]=useState(false);
  const seed=hash(book.id||book.title),v=variants[seed%variants.length],d=dims(book,seed);
  const cover=book.cover_message_id&&!failed?getLibraryCoverUrl(book.id,book.updated_at):null;
  return <button type="button" className="library-spine" style={{"--bw":d.w+"px","--bh":d.h+"px","--rot":((seed%7)-3)*.38+"deg","--lift":hover?"-20px":"0px","--z":hover?80:index%3+1} as React.CSSProperties}
    onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} onFocus={()=>setHover(true)} onBlur={()=>setHover(false)}
    onClick={e=>onOpen(book,e.currentTarget)} aria-label={"Open "+book.title}>
    <span className="spine-body" style={{background:`linear-gradient(105deg,rgba(255,255,255,.2),transparent 18%,rgba(0,0,0,.16) 84%,rgba(0,0,0,.36)),linear-gradient(90deg,${v[0]},${v[1]} 45%,${v[2]})`}}>
      {cover&&<img src={cover} alt="" onError={()=>setFailed(true)} />}
      <span className="spine-lines"/>
      <span className="spine-title" style={{color:v[3]}}>{book.title}</span>
      <span className="spine-author" style={{color:v[3]}}>{book.author?.split(" ").pop()||"AirBooks"}</span>
      <span className="spine-brand" style={{color:v[3]}}>AIRPAGES</span>
      {cover&&<span className="spine-cover-preview"><img src={cover} alt="" /></span>}
    </span>
    <span className="spine-shadow"/>
    {hover&&<span className="spine-caption">{book.title}<small>{book.author}</small></span>}
  </button>
}

export function LibraryShelf({books}:{books:LibraryBook[]}){
  const rail=useRef<HTMLDivElement>(null);const [query,setQuery]=useState("");const [selected,setSelected]=useState<LibraryBook|null>(null);
  const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return q?books.filter(b=>b.title.toLowerCase().includes(q)||(b.author||"").toLowerCase().includes(q)):books},[books,query]);
  const open=(book:LibraryBook,el:HTMLButtonElement)=>{setSelected(book)};
  return <div className="library-world">
    <header className="library-header">
      <div><div className="library-kicker">THE DIGITAL READING ROOM</div><h1>AirPages</h1><p>Every volume. One living shelf.</p></div>
      <div className="library-count"><strong>{books.length}</strong><span>volumes</span></div>
    </header>
    <div className="library-controls">
      <div className="library-search"><Search size={15}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your library…" /></div>
      <div className="library-hint">DRAG · SCROLL · HOVER</div>
    </div>
    <section className="library-frame">
      <div className="shelf-light"/>
      <div ref={rail} className="library-rail">
        <div className="library-row">
          {filtered.map((book,i)=><Spine key={book.id} book={book} index={i} onOpen={open}/>)}
          {!filtered.length&&<div className="empty-library">No volumes match your search.</div>}
        </div>
      </div>
      <div className="shelf-board"/>
      <div className="shelf-shadow"/>
    </section>
    <footer className="library-footer"><span>AirPages · powered by AirBooksWorld</span><span>{filtered.length} shown</span></footer>
    {selected&&<div className="book-launch" onClick={()=>setSelected(null)}>
      <div className="launch-card" onClick={e=>e.stopPropagation()}>
        <div className="launch-kicker">OPENING VOLUME</div><h2>{selected.title}</h2><p>{selected.author}</p>
        <div className="launch-actions"><button onClick={()=>window.location.href="/read/"+selected.id}><BookOpen size={16}/> Read in AirPages</button><button className="ghost" onClick={()=>window.location.href="/read/"+selected.id}>Open reader <ArrowRight size={15}/></button></div>
      </div>
    </div>}
  </div>
}
