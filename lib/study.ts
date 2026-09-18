"use client";import{useEffect,useState}from"react";
const storage=(id:string)=>"airpages:study:"+id;
export function useStudyState(id:string){const[bookmarks,setBookmarks]=useState<number[]>([]),[focus,setFocus]=useState(false),[notes,setNotes]=useState(false);
useEffect(()=>{try{const d=JSON.parse(localStorage.getItem(storage(id))||"{}");setBookmarks(d.bookmarks||[]);setFocus(!!d.focus)}catch{}},[id]);
useEffect(()=>{try{localStorage.setItem(storage(id),JSON.stringify({bookmarks,focus}))}catch{}},[id,bookmarks,focus]);
return{bookmarks,focus,notes,toggleBookmark:(p:number)=>setBookmarks(v=>v.includes(p)?v.filter(x=>x!==p):[...v,p].sort((a,b)=>a-b)),toggleFocus:()=>setFocus(v=>!v),toggleNotes:()=>setNotes(v=>!v)}}