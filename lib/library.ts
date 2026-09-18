const API_BASE=(process.env.NEXT_PUBLIC_AIRBOOKS_API_BASE_URL||"https://beyondbooks.onrender.com").replace(/\/$/,"");

export type LibraryBook={id:string;title:string;author?:string;filename:string;cover_message_id?:number|null;updated_at?:string;page_count?:number|null;pages?:number|null;tags?:string[]};

export async function fetchLibraryBooks(limit=120):Promise<{books:LibraryBook[];total:number}>{
  const res=await fetch(`${API_BASE}/api/books?limit=${limit}&offset=0`,{next:{revalidate:30}});
  if(!res.ok) throw new Error(`Library backend returned ${res.status}`);
  const data=await res.json();
  return {books:data.books||[],total:data.total||0};
}
export function getLibraryCoverUrl(id:string,version?:string|number){
  const base=`${API_BASE}/api/books/${encodeURIComponent(id)}/cover`;
  return version?`${base}?v=${encodeURIComponent(version)}`:base;
}
