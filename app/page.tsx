import Link from "next/link";
import { LibraryShelf } from "@/components/library/LibraryShelf";
import { fetchLibraryBooks } from "@/lib/library";

export default async function Home() {
  let books=[];
  let total=0;
  let error="";
  try {
    const result=await fetchLibraryBooks(120);
    books=result.books;
    total=result.total;
  } catch (e:any) {
    error=e?.message||"The library backend is unavailable.";
  }

  return <main>
    {error ? (
      <div className="library-world">
        <div className="empty-library">
          <h1>AirPages</h1>
          <p>{error}</p>
          <p>Refresh after the AirBooksWorld service is available.</p>
        </div>
      </div>
    ) : <LibraryShelf books={books}/>}
  </main>;
}
