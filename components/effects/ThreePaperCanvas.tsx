"use client";
import{useEffect,useRef}from"react";import type{ReaderPage}from"@/lib/document";import type{PresentationSettings}from"@/lib/effects/presentation";
export function ThreePaperCanvas({page,presentation}:{page:ReaderPage;presentation:PresentationSettings}){const ref=useRef<HTMLCanvasElement>(null);
useEffect(()=>{const c=ref.current;if(!c)return;const x=c.getContext("2d");if(!x)return;let raf=0,disposed=false,im:HTMLImageElement|null=null,tilt=0,target=0,t=.0;
const load=()=>{if(!page.imageUrl)return;const n=new Image();n.onload=()=>{im=n};n.src=page.imageUrl};
const draw=()=>{if(disposed)return;const w=c.clientWidth,h=c.clientHeight,dpr=Math.min(2,devicePixelRatio||1);c.width=w*dpr;c.height=h*dpr;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);tilt+=(target-tilt)*.08;t+=.012;const pw=Math.min(w*.72,860),ph=Math.min(h*.88,pw*1.414);x.save();x.translate(w/2,h/2+Math.sin(t)*2);x.rotate(tilt*.035*presentation.depth);
x.shadowColor="rgba(0,0,0,"+(.18+presentation.shadow*.3)+")";x.shadowBlur=24+presentation.shadow*36;x.shadowOffsetY=16+presentation.depth*18;x.fillStyle=presentation.background;x.fillRect(-pw/2,-ph/2,pw,ph);x.shadowColor="transparent";
const g=x.createLinearGradient(-pw/2,0,pw/2,0);g.addColorStop(0,"#fff");g.addColorStop(1,"#f4eee4");x.fillStyle=g;x.fillRect(-pw/2,-ph/2,pw,ph);
if(im){const s=Math.min(pw/im.naturalWidth,ph/im.naturalHeight),iw=im.naturalWidth*s,ih=im.naturalHeight*s;x.drawImage(im,-iw/2,-ih/2,iw,ih)}else{x.fillStyle="#5d5146";x.font="600 18px Inter,system-ui,sans-serif";x.textAlign="center";x.fillText(page.label.toUpperCase(),0,-10);x.font="400 12px Inter,system-ui,sans-serif";x.fillText("AirPages document page",0,18)}
x.restore();raf=requestAnimationFrame(draw)};
const move=(e:PointerEvent)=>{const r=c.getBoundingClientRect();target=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/r.width))};
c.addEventListener("pointermove",move);c.addEventListener("pointerleave",()=>{target=0});load();draw();return()=>{disposed=true;cancelAnimationFrame(raf);c.removeEventListener("pointermove",move)}} ,[page.imageUrl,page.label,presentation]);
return <canvas ref={ref} className="paper-canvas"/>}
