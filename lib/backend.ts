const API_URL = (process.env.NEXT_PUBLIC_AIRBOOKS_API_BASE_URL || "https://beyondbooks.onrender.com").replace(/\/$/, "");

export type BackendBook = {
  id: string;
  title: string;
  author?: string;
  filename: string;
  description?: string;
  language?: string;
  page_count?: number | null;
  pages?: number | null;
  reader_status?: "ready" | "converting" | "failed" | "unsupported";
  reader_format?: string | null;
  reader_error?: string | null;
};

export type ReaderInfo = {
  status: string;
  reader_status: "ready" | "converting" | "failed" | "unsupported";
  reader_format: string | null;
  reader_error: string | null;
  reader_url: string | null;
};

async function api(path: string) {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend returned ${res.status}`);
  return res;
}

export async function fetchBook(id: string): Promise<BackendBook> {
  const data = await (await api(`/api/books/${encodeURIComponent(id)}`)).json();
  return data.book;
}

export async function fetchReaderInfo(id: string): Promise<ReaderInfo> {
  return (await api(`/api/books/${encodeURIComponent(id)}/reader-info`)).json();
}

export function getDownloadUrl(id: string) {
  return `${API_URL}/api/books/${encodeURIComponent(id)}/download`;
}

export function getReaderFileUrl(id: string) {
  return `${API_URL}/api/books/${encodeURIComponent(id)}/reader-file`;
}

export function getCoverUrl(id: string) {
  return `${API_URL}/api/books/${encodeURIComponent(id)}/cover`;
}

export function getFileExt(filename: string) {
  const part = filename.split(".").pop();
  return part ? part.toUpperCase() : "";
}
