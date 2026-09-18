import Link from "next/link";
import { LibraryShelf } from "@/components/library/LibraryShelf";
import { fetchLibraryBooks, type LibraryBook } from "@/lib/library";

export default async function Home() {
  let books: LibraryBook[] = [];
  let total = 0;
  let error = "";

  try {
    const result = await fetchLibraryBooks(120);
    books = result.books;
    total = result.total;
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "The library backend is unavailable.";
  }

  return (
    <main>
      {error ? (
        <div className="library-world">
          <div className="empty-library">
            <h1>AirPages</h1>
            <p>{error}</p>
            <p>Refresh after the AirBooksWorld service is available.</p>
            <Link href="/read/airpages-demo">Open the presentation demo →</Link>
          </div>
        </div>
      ) : (
        <LibraryShelf books={books} />
      )}
    </main>
  );
}
