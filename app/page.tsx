import { LibraryShelf } from "@/components/library/LibraryShelf";
import { fetchLibraryBooks } from "@/lib/library";
import { readingRoom } from "@/lib/reading-room";

export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const { books, total } = await fetchLibraryBooks(120);
    return <LibraryShelf books={books.length ? books : readingRoom} total={total}
      notice={books.length ? "" : "Your catalogue is empty. Explore the reading room’s poetry selection."} />;
  } catch {
    return <LibraryShelf books={readingRoom} total={0}
      notice="The catalogue is temporarily unavailable. These poems are ready to read." />;
  }
}
