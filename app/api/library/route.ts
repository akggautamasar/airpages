import { fetchLibraryBooks } from "@/lib/library";

export async function GET(request: Request) {
  const offset = Number(new URL(request.url).searchParams.get("offset"));
  if (!Number.isSafeInteger(offset) || offset < 0) return new Response(null, { status: 400 });
  try {
    return Response.json(await fetchLibraryBooks(120, offset));
  } catch {
    return Response.json({ error: "Could not load more books." }, { status: 503 });
  }
}
