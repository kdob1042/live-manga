import type { Rect, Page, Panel, Manifest } from '../contracts/types';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { validate } from '../contracts/validate.mjs';
import './style.css';
import type {Preview} from '../contracts/preview-types';
import {previewMatches} from '../contracts/preview.mjs';
import PreviewEntry,{parsePreviewLocation} from './PreviewEntry';
import ReaderSidebar from './ReaderSidebar';
import WorkLibrary from './WorkLibrary';
import {fetchPublicationCatalog, findEpisode, findWork, parseViewerRoute, type PublicationCatalog} from './publication-client';
const panelLabel=(panel:Panel)=>panel.text||'画像のみのコマ';
const placement=(r:Rect,p:Page)=>({left:`${r.x/p.width*100}%`,top:`${r.y/p.height*100}%`,width:`${r.width/p.width*100}%`,height:`${r.height/p.height*100}%`});
const relative=(r:Rect,box:Rect)=>({left:`${(r.x-box.x)/box.width*100}%`,top:`${(r.y-box.y)/box.height*100}%`,width:`${r.width/box.width*100}%`,height:`${r.height/box.height*100}%`});
const clipStyle=(panel:Panel,box=panel.frame)=>panel.clip?{clipPath:`polygon(${panel.clip.map(([x,y])=>`${(x-box.x)/box.width*100}% ${(y-box.y)/box.height*100}%`).join(',')})`}:{};
const surfaceRect=(panel:Panel)=>panel.motion?panel.frame:panel.artRect;
const actionRect=(panel:Panel)=>panel.motion?panel.frame:panel.artRect;
const hitAreaStyle=(panel:Panel)=>panel.clip?{...relative(panel.artRect,panel.frame),right:'auto',bottom:'auto',...clipStyle(panel,panel.artRect)}:{};
const markerStyle=(_panel:Panel,_page:Page)=>({
 position:'absolute' as const,
 left:'50%',
 top:'6px',
 transform:'translateX(-50%)'
});
const LONG_PRESS_MS=450,MOVE_TOLERANCE=10;
export function Reader({manifest,base,preview,onRefreshPreview,refreshing=false,catalog,workId,format,episodeId}:{manifest:Manifest;base:string;preview?:Preview;onRefreshPreview?:()=>void;refreshing?:boolean;catalog?:PublicationCatalog;workId?:string;format?:'manga';episodeId?:string}) {
 const [selectedTags,setSelectedTags]=useState<string[]>([]),[tagMode,setTagMode]=useState<'any'|'all'>('any');
 const matched=preview?previewMatches(preview,selectedTags,tagMode):null;
 const visible: Set<string>=new Set<string>(matched?.pageIds??manifest.pages.map(p=>p.id));
 const matchingPanels=new Set(matched?.panelIds??[]);
 const [active,setActive]=useState<string|null>(null),[status,setStatus]=useState(''),[failed,setFailed]=useState<Record<string,boolean>>({}),[modalPanel,setModalPanel]=useState<Panel|null>(null);
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const generation=useRef(0),current=useRef<HTMLVideoElement|null>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),surface=useRef<HTMLDivElement|null>(null),dialog=useRef<HTMLDialogElement|null>(null),modalHost=useRef<HTMLDivElement|null>(null),longPress=useRef<{timer:ReturnType<typeof setTimeout>;x:number;y:number}|null>(null),suppressClick=useRef(false),lastInput=useRef<'touch'|'mouse'>('mouse'),restoreFocus=useRef<HTMLElement|null>(null),sidebarToggle=useRef<HTMLButtonElement|null>(null);
 const assets=new Map(manifest.assets.map(a=>[a.id,a]));const url=(id:string)=>base+assets.get(id)!.path;
 function cancelLongPress(){if(longPress.current){clearTimeout(longPress.current.timer);longPress.current=null;}}
 function closeDialog(){if(dialog.current?.open)dialog.current.close();document.body.classList.remove('modal-open');setModalPanel(null);const target=restoreFocus.current;restoreFocus.current=null;if(target){target.focus({preventScroll:true});requestAnimationFrame(()=>{if(target.isConnected)target.focus({preventScroll:true});});}}
 function stop(message='',closeModal=true) {generation.current++;clearTimeout(timer.current);cancelLongPress();if(current.current){current.current.pause();current.current.removeAttribute('src');current.current.load();current.current.remove();current.current=null;}setActive(null);setStatus(message);if(closeModal)closeDialog();}
 useEffect(()=>{const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('visibilitychange',hide);stop();};},[]);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&sidebarOpen)closeSidebar();};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[sidebarOpen]);
 useEffect(()=>{if(!active)return;const observer=new IntersectionObserver(entries=>{if(entries.some(e=>!e.isIntersecting))stop();},{threshold:0});observer.observe(surface.current!);return()=>observer.disconnect();},[active]);
 useEffect(()=>{if(!active)return;const stopOutside=(event:MouseEvent)=>{const target=event.target; if(!(target instanceof Element))return; if(target.closest('.panel-hit-area,.video-dialog-shell'))return; stop();};document.addEventListener('click',stopOutside);return()=>document.removeEventListener('click',stopOutside);},[active]);
 function start(panel:Panel,host:HTMLDivElement,{expanded=false,resumeAt=0}={}) {
  const epoch=generation.current,video=document.createElement('video');surface.current=host.parentElement as HTMLDivElement;
  video.playsInline=true;video.muted=true;video.controls=expanded;video.preload='none';if(!expanded)video.setAttribute('aria-hidden','true');else video.setAttribute('aria-label',`${panelLabel(panel)} 動画`);video.style.opacity='0';video.src=url(panel.motion!.asset);host.append(video);current.current=video;setActive(panel.id);setStatus(expanded?'拡大動画を読み込み中…':'読み込み中…');
  const valid=()=>generation.current===epoch&&current.current===video;
  const fail=()=>{if(valid())stop('動画を読み込めませんでした。コマを押すと再試行できます。');};
  video.onloadedmetadata=()=>{if(valid()&&resumeAt>0)video.currentTime=Math.min(resumeAt,Math.max(0,video.duration-.05));};
  video.onplaying=()=>{if(!valid()){video.pause();return;}clearTimeout(timer.current);video.style.opacity='1';setStatus(expanded?'拡大再生中':'再生中');};
  video.onended=()=>{if(valid())stop();};video.onerror=fail;video.onstalled=()=>{if(valid()){clearTimeout(timer.current);timer.current=setTimeout(fail,15000);}};
  timer.current=setTimeout(fail,15000);video.play().then(()=>{if(!valid())video.pause();}).catch(fail);
 }
 function play(panel:Panel) {
  if(active===panel.id){stop();return;}stop();start(panel,document.getElementById(`motion-${panel.id}`) as HTMLDivElement);
 }
 function expand(panel:Panel,trigger:HTMLElement) {
  const resumeAt=active===panel.id?(current.current?.currentTime||0):0;stop('',false);restoreFocus.current=trigger;setModalPanel(panel);dialog.current!.showModal();document.body.classList.add('modal-open');start(panel,modalHost.current!,{expanded:true,resumeAt});
 }
 function beginLongPress(event:React.PointerEvent<HTMLButtonElement>,panel:Panel){
  if(event.button!==0)return;
  event.currentTarget.focus({preventScroll:true});
  lastInput.current=event.pointerType==='touch'?'touch':'mouse';
  suppressClick.current=false;
  if(event.pointerType!=='touch'){cancelLongPress();return;}
  cancelLongPress();
  const target=event.currentTarget;
  longPress.current={x:event.clientX,y:event.clientY,timer:setTimeout(()=>{longPress.current=null;suppressClick.current=true;expand(panel,target);},LONG_PRESS_MS)};
 }
 function moveLongPress(event:React.PointerEvent<HTMLButtonElement>){const press=longPress.current;if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>MOVE_TOLERANCE)cancelLongPress();}
 function activate(panel:Panel,trigger:HTMLButtonElement,event:React.MouseEvent<HTMLButtonElement>){
  if(suppressClick.current){suppressClick.current=false;return;}
  const pointerType=(event.nativeEvent as PointerEvent).pointerType;
  const touch=pointerType==='touch'||(!pointerType&&lastInput.current==='touch');
  if(active===panel.id){if(touch)stop();else expand(panel,trigger);return;}
  play(panel);
 }
 function closeSidebar(){setSidebarOpen(false);requestAnimationFrame(()=>sidebarToggle.current?.focus());}
 return <div className={`reader-shell${sidebarOpen?' sidebar-open':''}`}>
  <ReaderSidebar manifest={manifest} preview={preview} pages={manifest.pages} visiblePageIds={visible} selectedTags={selectedTags} tagMode={tagMode} open={sidebarOpen} refreshing={refreshing} onClose={closeSidebar} onTagsChange={(tags,mode)=>{stop();setSelectedTags(tags);setTagMode(mode);}} onRefresh={onRefreshPreview} catalog={catalog} currentWorkId={workId} currentFormat={format} currentEpisodeId={episodeId}/>
  <button ref={sidebarToggle} className={`sidebar-toggle${sidebarOpen?' is-open':''}`} type="button" aria-expanded={sidebarOpen} aria-controls="reader-sidebar" aria-label={sidebarOpen?'読書メニューを閉じる':'読書メニューを開く'} onClick={()=>setSidebarOpen(value=>!value)}><span aria-hidden="true">{sidebarOpen?'›':'‹'}</span></button>
  <main className="reader-main">
   <div className="reader-status" role="status" aria-live="polite">{status}</div>
   {!visible.size&&<p className="empty-filter" role="status">該当するシーンを含むページはありません。</p>}
   {manifest.pages.map((page,index)=>({page,index})).filter(({page})=>visible.has(page.id)).map(({page,index})=><section id={`page-${page.id}`} className="reader-page" key={page.id} aria-label={`${index+1}ページ`}>
    <div className="page" style={{aspectRatio:`${page.width}/${page.height}`}}>
     <img className="layer" src={url(failed[page.id]?page.fallback:page.art)} width={page.width} height={page.height} alt={`${index+1}ページの漫画。本文は読書メニュー内の「テキストで読む」にあります。`} onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>
     {!failed[page.id]&&page.panels.filter(p=>p.motion).map(panel=><React.Fragment key={panel.id}><div className={`motion${panel.clip?' motion-clip':''}`} style={{...placement(surfaceRect(panel),page),...clipStyle(panel)}}><div className="motion-media" id={`motion-${panel.id}`} style={panel.clip?relative(panel.artRect,panel.frame):undefined}/></div><div className="panel-actions" style={placement(actionRect(panel),page)}><button className="panel-hit-area" style={hitAreaStyle(panel)} aria-label={`${panelLabel(panel)} ${active===panel.id?'再生中。PCはもう一度クリック、スマホは長押しで拡大':'タップでコマ内再生。スマホは長押しで拡大'}`} aria-pressed={active===panel.id} onPointerDown={e=>beginLongPress(e,panel)} onPointerMove={moveLongPress} onPointerUp={e=>{if(e.pointerType==='touch')cancelLongPress();}} onPointerCancel={cancelLongPress} onPointerLeave={e=>{if(e.pointerType==='touch')cancelLongPress();}} onContextMenu={e=>e.preventDefault()} onClick={e=>activate(panel,e.currentTarget,e)}><span className="sr-only">動きのあるコマ</span></button><span className={`motion-marker ${active===panel.id?'is-active':''}`} style={markerStyle(panel,page)} aria-hidden="true"/></div></React.Fragment>)}
     {!failed[page.id]&&<img className="layer overlay" src={url(page.overlay)} width={page.width} height={page.height} alt="" onError={()=>{stop();setFailed(f=>({...f,[page.id]:true}));}}/>}
     <span className="folio" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
     {preview&&<div className="preview-page-status">{!!selectedTags.length&&<p>該当シーンのコマ: {page.panels.map((p,i)=>matchingPanels.has(p.id)?i+1:null).filter(Boolean).join('、')}</p>}{page.panels.map((panel,panelIndex)=>{const state=preview.panels.find(p=>p.id===panel.id);if(!state)return null;const notes=[state.art==='pending'?'作画待ち':'',state.lettering==='pending'?'文字配置待ち':'',state.motion==='stale'?'動画は旧版のため静止表示':state.motion==='pending'?'動画待ち':''].filter(Boolean);return notes.length?<p key={panel.id}>{panelIndex+1}コマ目: {notes.join('・')}</p>:null;})}</div>}
    </div>
   </section>)}
  </main>
  <dialog ref={dialog} className="video-dialog" aria-label={modalPanel?`${panelLabel(modalPanel)}の拡大動画`:'拡大動画'} onCancel={e=>{e.preventDefault();stop();}} onClick={e=>{if(e.target===e.currentTarget)stop();}}><div className="video-dialog-shell"><div className="video-dialog-head"><p>{modalPanel?panelLabel(modalPanel):''}</p><button className="dialog-close" aria-label="拡大動画を閉じる" onClick={()=>stop()}>×</button></div><div className="modal-motion"><div ref={modalHost} className="modal-media"/></div></div></dialog>
 </div>;
}
async function start() {
 const root=createRoot(document.getElementById('root')!);
 const loadLegacy=async()=>{
  let release=new URL(location.href).searchParams.get('release');
  if(!release){const catalog=await fetch('/catalog.json',{signal:AbortSignal.timeout(15000),cache:'no-cache'});if(catalog.ok){const text=await catalog.text();if(text.length>1024)throw Error('公開一覧が不正です');const value=JSON.parse(text);release=typeof value.current==='string'?value.current:null;}else if(catalog.status!==404)throw Error('公開一覧を取得できません');}
  if(release&&!/^[a-zA-Z0-9:_-]{1,128}$/.test(release))throw Error('刊行版の指定が不正です');
  const base=release?`/releases/${release}/`:'/demo/';
  const response=await fetch(base+'live-manga.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('作品を取得できません');
  const data=await response.text();if(data.length>4*1024*1024)throw Error('作品データが大きすぎます');const manifest=validate(JSON.parse(data)) as Manifest;
  if(release&&manifest.releaseId!==release)throw Error('刊行版が一致しません');root.render(<Reader manifest={manifest} base={base}/>);
 };
 try {
  const scope=parsePreviewLocation(location.href);
  if(scope){root.render(<PreviewEntry scope={scope} render={(preview,base,onRefresh,refreshing)=><Reader key={base} manifest={preview.manifest} base={base} preview={preview} onRefreshPreview={onRefresh} refreshing={refreshing}/>}/>);return;}
  const route=parseViewerRoute(location.pathname);
  if(route.kind==='library'&&new URL(location.href).searchParams.has('release')){await loadLegacy();return;}
  if(route.kind==='library'||route.kind==='work'||route.kind==='episode'){
   let catalog:PublicationCatalog;
   try{catalog=await fetchPublicationCatalog();}catch(error){if(route.kind==='library'){await loadLegacy();return;}throw error;}
   if(route.kind==='library'){root.render(<WorkLibrary catalog={catalog}/>);return;}
   if(route.kind==='work'){if(!findWork(catalog,route.workId))throw Error('作品が見つかりません');root.render(<WorkLibrary catalog={catalog} focusWorkId={route.workId}/>);return;}
   const episode=findEpisode(catalog,route.workId,route.format,route.episodeId);
   if(!episode)throw Error('話が見つかりません');
   if(episode.locked)throw Error('この話は公開予定です');
   const base=`/works/${route.workId}/manga/${route.episodeId}/`;
   const response=await fetch(base+'manifest.json',{signal:AbortSignal.timeout(15000),cache:'no-cache'});if(!response.ok)throw Error('漫画を取得できません');
   const data=await response.text();if(data.length>4*1024*1024)throw Error('作品データが大きすぎます');const manifest=validate(JSON.parse(data)) as Manifest;
   if(manifest.workId!==route.workId||manifest.episodeId!==route.episodeId)throw Error('作品と話が一致しません');
   root.render(<Reader manifest={manifest} base={base} catalog={catalog} workId={route.workId} format="manga" episodeId={route.episodeId}/>);return;
  }
  throw Error('ページが見つかりません');
 } catch(error){root.render(<main role="alert"><h1>作品を開けませんでした</h1><p>{error instanceof Error ? error.message : String(error)}</p><a href="/">作品一覧へ戻る</a></main>);}
}
start();

