import { ReadBookClient } from "@/components/reader/ReadBookClient";

import Link from "next/link";
import { editions } from "@/lib/reading-room";

export default function ReadBookPage({ params }: { params: { id: string } }) {
  const edition = editions.find(book => book.id === params.id);
  if (edition) return (
    <main className="poetry-page">
      <Link href="/">← Back to the shelf</Link>
      <article>
        <p className="catalog-label">Poetry · The reading room</p>
        <h1>{edition.title}</h1><p>{edition.author}</p>
        <div className="verse">{edition.lines.map(line => <div key={line}>{line}</div>)}</div>
      </article>
    </main>
  );
  return <ReadBookClient id={params.id} />;
}
