import type { Rect, Page, Panel, Manifest } from '../contracts/types';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validate } from '../contracts/validate.mjs';
import './style.css';
const placement=(r:Rect,p:Page)=>({left:`${r.x/p.width*100}%`,top:`${r.y/p.height*100}%`,width:`${r.width/p.width*100}%`,height:`${r.height/p.height*100}%`});
const LONG_PRESS_MS=450,MOVE_TOLERANCE=10;
export function Reader({manifest,base}:{manifest:Manifest;base:string}) {
 const [still,setStill]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[active,setActive]=useState<string|null>(null),[status,setStatus]=useState(''),[failed,setFailed]=useState<Record<string,boolean>>({}),[modalPanel,setModalPanel]=useState<Panel|null>(null);
 const generation=useRef(0),current=useRef<HTMLVideoElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),surface=useRef<HTMLDivElement|null>(null),dialog=useRef<HTMLDialogElement|null>(null),modalHost=useRef<HTMLDivElement|null>(null),longPress=useRef<{timer:ReturnType<typeof setTimeout>;x:number;y:number}|null>(null),suppressClick=useRef(false),restoreFocus=useRef<HTMLElement|null>(null);
 const assets=new Map(manifest.assets.map(a=>[a.id,a]));const url=(id:string)=>base+assets.get(id)!.path;
 function cancelLongPress(){if(longPress.current){clearTimeout(longPress.current.timer);longPress.current=null;}}
 function closeDialog(){if(dialog.current?.open)dialog.current.close();document.body.classList.remove('modal-open');setModalPanel(null);const target=restoreFocus.current;restoreFocus.current=null;target?.focus();}
 function stop(message='',closeModal=true) {generation.current++;clearTimeout(timer.current);cancelLongPress();if(current.current){current.current.pause();current.current.removeAttribute('src');current.current.load();current.current.remove();current.current=null;}setActive(null);setStatus(message);if(closeModal)closeDialog();}
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stop();};},[]);
 useEffect(()=>{if(!active)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>!e.isIntersecting))stop();},{threshold:0});observer.observe(surface.current!);return()=>observer.disconnect();},[active]);
 function start(panel:Panel,host:HTMLDivElement,{expanded=false,resumeAt=0}={}) {
  const epoch=generation.current,video=document.createElement('video');surface.current=host;
  video.playsInline=true;video.muted=true;video.controls=expanded;video.preload='none';if(!expanded)video.setAttribute('aria-hidden','true');else video.setAttribute('aria-label',`${panel.text} 動画`);video.style.opacity='0';video.src=url(panel.motion!.asset);host.append(video);current.current=video;setActive(panel.id);setStatus(expanded?'拡大動画を読み込み中…':'読み込み中…');
  const valid=()=>generation.current===epoch&&current.current===video;
  const fail=()=>{if(valid())stop('動画を読み込めませんでした。コマを押すと再試行できます。');};
  video.onloadedmetadata=()=>{if(valid()&&resumeAt>0)video.currentTime=Math.min(resumeAt,Math.max(0,video.duration-.05));};
  video.onplaying=()=>{if(!valid()){video.pause();return;}clearTimeout(timer.current);video.style.opacity='1';setStatus(expanded?'拡大再生中':'再生中 · もう一度押すと停止');};
  video.onended=()=>{if(valid())stop();};video.onerror=fail;video.onstalled=()=>{if(valid()){clearTimeout(timer.current);timer.current=setTimeout(fail,15000);}};
  timer.current=setTimeout(fail,15000);video.play().then(()=>{if(!valid())video.pause();}).catch(fail);
 }
 function play(panel:Panel) {
  if(still)return;if(active===panel.id){stop();return;}stop();start(panel,document.getElementById(`motion-${panel.id}`) as HTMLDivElement);
 }
 function expand(panel:Panel,trigger:HTMLElement) {
  if(still)return;const resumeAt=active===panel.id?(current.current?.currentTime||0):0;stop('',false);restoreFocus.current=trigger;setModalPanel(panel);dialog.current!.showModal();document.body.classList.add('modal-open');start(panel,modalHost.current!,{expanded:true,resumeAt});
 }
 function beginLongPress(event:React.PointerEvent<HTMLButtonElement>,panel:Panel){if(event.button!==0)return;cancelLongPress();suppressClick.current=false;const target=event.currentTarget;longPress.current={x:event.clientX,y:event.clientY,timer:setTimeout(()=>{longPress.current=null;suppressClick.current=true;expand(panel,target);},LONG_PRESS_MS)};}
 function moveLongPress(event:React.PointerEvent<HTMLButtonElement>){const press=longPress.current;if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>MOVE_TOLERANCE)cancelLongPress();}
 function activate(panel:Panel){if(suppressClick.current){suppressClick.current=false;return;}play(panel);}
 return <><header><a href="/" aria-label="Live Manga">LIVE <b>MANGA</b></a><label><input type="checkbox" checked={still} onChange={e=>{stop();setStill(e.target.checked);}}/>静止漫画として読む</label></header><main><div className="intro"><span>LIVE MANGA / 01</span><h1>{manifest.title}</h1><p>自分のペースで読む。触れたコマだけ、動き出す。</p></div><div className="status" role="status" aria-live="polite">{status||'▶ のあるコマに触れて再生'}</div>{manifest.pages.map((page,index)=><section key={page.id} aria-label={`${index+1}ページ`}><div className="page" style={{aspectRatio:`${page.width}/${page.height}`}}>
 <img className="layer" src={url(failed[page.id]?page.fallback:page.art)} width={page.width} height={page.height} alt={`${index+1}ページの漫画。本文はページ下の「テキストで読む」にあります。`} onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>
 {!failed[page.id]&&page.panels.filter(p=>p.motion).map(panel=><React.Fragment key={panel.id}><div className="motion" id={`motion-${panel.id}`} style={placement(panel.artRect,page)}/>{!still&&<div className="panel-actions" style={placement(panel.artRect,page)}><button className={`panel-control ${active===panel.id?'playing':''}`} aria-label={`${panel.text} ${active===panel.id?'停止':'再生'}。長押しで拡大`} onPointerDown={e=>beginLongPress(e,panel)} onPointerMove={moveLongPress} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onContextMenu={e=>e.preventDefault()} onClick={()=>activate(panel)}><span>{active===panel.id?'Ⅱ':'▶'}</span></button><button className="expand-control" aria-label={`${panel.text}の動画を大きく表示`} onClick={e=>expand(panel,e.currentTarget)}><span aria-hidden="true">⛶</span></button></div>}</React.Fragment>)}
 {!failed[page.id]&&<img className="layer overlay" src={url(page.overlay)} width={page.width} height={page.height} alt="" onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>}
 </div><p className="folio">{String(index+1).padStart(2,'0')}</p><details><summary>テキストで読む</summary>{page.panels.map(panel=><p key={panel.id}>{panel.text}</p>)}</details></section>)}</main><footer>LIVE MANGA · {manifest.releaseId}</footer>
 <dialog ref={dialog} className="video-dialog" aria-label={modalPanel?`${modalPanel.text}の拡大動画`:'拡大動画'} onCancel={e=>{e.preventDefault();stop();}} onClick={e=>{if(e.target===e.currentTarget)stop();}}><div className="video-dialog-shell"><div className="video-dialog-head"><p>{modalPanel?.text}</p><button className="dialog-close" aria-label="拡大動画を閉じる" onClick={()=>stop()}>×</button></div><div ref={modalHost} className="modal-motion"/></div></dialog></>;
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
