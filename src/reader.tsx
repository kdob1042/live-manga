import type { Rect, Page, Panel, Manifest } from '../contracts/types';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validate } from '../contracts/validate.mjs';
import './style.css';
const placement=(r:Rect,p:Page)=>({left:`${r.x/p.width*100}%`,top:`${r.y/p.height*100}%`,width:`${r.width/p.width*100}%`,height:`${r.height/p.height*100}%`});
export function Reader({manifest,base}:{manifest:Manifest;base:string}) {
 const [still,setStill]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[active,setActive]=useState<string|null>(null),[status,setStatus]=useState(''),[failed,setFailed]=useState<Record<string,boolean>>({});
 const generation=useRef(0),current=useRef<HTMLVideoElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),surface=useRef<HTMLDivElement|null>(null);
 const assets=new Map(manifest.assets.map(a=>[a.id,a]));const url=(id:string)=>base+assets.get(id)!.path;
 function stop(message='') {generation.current++;clearTimeout(timer.current);if(current.current){current.current.pause();current.current.removeAttribute('src');current.current.load();current.current.remove();current.current=null;}setActive(null);setStatus(message);}
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stop();};},[]);
 useEffect(()=>{if(!active)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>!e.isIntersecting))stop();},{threshold:0});observer.observe(surface.current!);return()=>observer.disconnect();},[active]);
 function play(panel:Panel) {
  if(still)return;if(active===panel.id){stop();return;}stop();const epoch=generation.current;
  const host=document.getElementById(`motion-${panel.id}`) as HTMLDivElement,video=document.createElement('video');surface.current=host;
  video.playsInline=true;video.muted=true;video.preload='none';video.setAttribute('aria-hidden','true');video.style.opacity='0';video.src=url(panel.motion!.asset);host.append(video);current.current=video;setActive(panel.id);setStatus('読み込み中…');
  const valid=()=>generation.current===epoch&&current.current===video;
  const fail=()=>{if(valid())stop('動画を読み込めませんでした。コマを押すと再試行できます。');};
  video.onplaying=()=>{if(!valid()){video.pause();return;}clearTimeout(timer.current);video.style.opacity='1';setStatus('再生中 · もう一度押すと停止');};
  video.onended=()=>{if(valid())stop();};video.onerror=fail;video.onstalled=()=>{if(valid()){clearTimeout(timer.current);timer.current=setTimeout(fail,15000);}};
  timer.current=setTimeout(fail,15000);video.play().then(()=>{if(!valid())video.pause();}).catch(fail);
 }
 return <><header><a href="/" aria-label="Live Manga">LIVE <b>MANGA</b></a><label><input type="checkbox" checked={still} onChange={e=>{stop();setStill(e.target.checked);}}/>静止漫画として読む</label></header><main><div className="intro"><span>LIVE MANGA / 01</span><h1>{manifest.title}</h1><p>自分のペースで読む。触れたコマだけ、動き出す。</p></div><div className="status" role="status" aria-live="polite">{status||'▶ のあるコマに触れて再生'}</div>{manifest.pages.map((page,index)=><section key={page.id} aria-label={`${index+1}ページ`}><div className="page" style={{aspectRatio:`${page.width}/${page.height}`}}>
 <img className="layer" src={url(failed[page.id]?page.fallback:page.art)} width={page.width} height={page.height} alt={`${index+1}ページの漫画。本文はページ下の「テキストで読む」にあります。`} onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>
 {!failed[page.id]&&page.panels.filter(p=>p.motion).map(panel=><React.Fragment key={panel.id}><div className="motion" id={`motion-${panel.id}`} style={placement(panel.artRect,page)}/>{!still&&<button className={`panel-control ${active===panel.id?'playing':''}`} style={placement(panel.artRect,page)} aria-label={`${panel.text} ${active===panel.id?'停止':'再生'}`} onClick={()=>play(panel)}><span>{active===panel.id?'Ⅱ':'▶'}</span></button>}</React.Fragment>)}
 {!failed[page.id]&&<img className="layer overlay" src={url(page.overlay)} width={page.width} height={page.height} alt="" onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>}
 </div><p className="folio">{String(index+1).padStart(2,'0')}</p><details><summary>テキストで読む</summary>{page.panels.map(panel=><p key={panel.id}>{panel.text}</p>)}</details></section>)}</main><footer>LIVE MANGA · {manifest.releaseId}</footer></>;
}
async function start() {
 const root=createRoot(document.getElementById('root')!);
 try {
  let release=new URL(location.href).searchParams.get('release');
  if(!release){const catalog=await fetch('/catalog.json',{signal:AbortSignal.timeout(15000),cache:'no-cache'});if(catalog.ok){const text=await catalog.text();if(text.length>1024)throw Error('公開一覧が不正です');release=JSON.parse(text).current;}else if(catalog.status!==404)throw Error('公開一覧を取得できません');}
  if(release&&!/^[a-zA-Z0-9:_-]{1,128}$/.test(release))throw Error('刊行版の指定が不正です');
  const base=release?`/releases/${release}/`:'/demo/';
  const response=await fetch(base+'live-manga.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('作品を取得できません');
  const data=await response.text();if(data.length>4*1024*1024)throw Error('作品データが大きすぎます');const manifest=validate(JSON.parse(data)) as Manifest;
  if(release&&manifest.releaseId!==release)throw Error('刊行版が一致しません');root.render(<Reader manifest={manifest} base={base}/>);
 } catch(error){root.render(<main role="alert"><h1>作品を開けませんでした</h1><p>{error instanceof Error ? error.message : String(error)}</p><a href="/">サンプルを読む</a></main>);}
}
start();
