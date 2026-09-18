const API_BASE=process.env.NEXT_PUBLIC_AIRBOOKS_API_BASE_URL||"https://beyondbooks.onrender.com";
export async function airBooksFetch<T>(path:string,init?:RequestInit):Promise<T>{const r=await fetch(API_BASE.replace(/\/$/,"")+"/"+path.replace(/^\//,""),{...init,headers:{"Content-Type":"application/json",...(init?.headers||{})},cache:"no-store"});if(!r.ok)throw new Error("AirBooksWorld API error: "+r.status);return r.json();}
export const getAirBooksApiBase=()=>API_BASE;
