import React from 'react';
import {createRoot} from 'react-dom/client';
import {validate} from '../contracts/validate.mjs';
import type {Manifest} from '../contracts/types';
import {fetchPublicationCatalog, findEpisode, findWork, parseViewerRoute, type PublicationCatalog} from './publication-client';
import './style.css';

async function start() {
 const root=createRoot(document.getElementById('root')!);
 const loadLegacy=async()=>{
  let release=new URL(location.href).searchParams.get('release');
  if(!release){const catalog=await fetch('/catalog.json',{signal:AbortSignal.timeout(15000),cache:'no-cache'});if(catalog.ok){const text=await catalog.text();if(text.length>1024)throw Error('公開一覧が不正です');const value=JSON.parse(text);release=typeof value.current==='string'?value.current:null;}else if(catalog.status!==404)throw Error('公開一覧を取得できません');}
  if(release&&!/^[a-zA-Z0-9:_-]{1,128}$/.test(release))throw Error('刊行版の指定が不正です');
  const base=release?`/releases/${release}/`:'/demo/';
  const response=await fetch(base+'live-manga.json',{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('作品を取得できません');
  const data=await response.text();if(data.length>4*1024*1024)throw Error('作品データが大きすぎます');const manifest=validate(JSON.parse(data)) as Manifest;
  if(release&&manifest.releaseId!==release)throw Error('刊行版が一致しません');const {Reader}=await import('./reader');root.render(<Reader manifest={manifest} base={base}/>);
 };
 try {
  const wantsPreview=new URL(location.href).searchParams.has('preview');
  const {default:PreviewEntry,parsePreviewLocation}=wantsPreview?await import('./PreviewEntry'): {default:null,parsePreviewLocation:()=>null};
  const scope=parsePreviewLocation(location.href);
  if(scope&&PreviewEntry){const {Reader}=await import('./reader');root.render(<PreviewEntry scope={scope} render={(preview,base,onRefresh,refreshing)=><Reader key={base} manifest={preview.manifest} base={base} preview={preview} onRefreshPreview={onRefresh} refreshing={refreshing}/>}/>);return;}
  const route=parseViewerRoute(location.pathname);
  if(route.kind==='library'&&new URL(location.href).searchParams.has('release')){await loadLegacy();return;}
  if(route.kind==='library'||route.kind==='work'||route.kind==='episode'){
   let catalog:PublicationCatalog;
   try{catalog=await fetchPublicationCatalog();}catch(error){if(route.kind==='library'){await loadLegacy();return;}throw error;}
   if(route.kind==='library'){const {default:WorkLibrary}=await import('./WorkLibrary');root.render(<WorkLibrary catalog={catalog}/>);return;}
   if(route.kind==='work'){if(!findWork(catalog,route.workId))throw Error('作品が見つかりません');const {default:WorkLibrary}=await import('./WorkLibrary');root.render(<WorkLibrary catalog={catalog} focusWorkId={route.workId}/>);return;}
   const episode=findEpisode(catalog,route.workId,route.format,route.episodeId);
   if(!episode)throw Error('話が見つかりません');
   if(episode.locked)throw Error('この話は公開予定です');
   const base=`/works/${route.workId}/manga/${route.episodeId}/`;
   const response=await fetch(base+'manifest.json',{signal:AbortSignal.timeout(15000),cache:'no-cache'});if(!response.ok)throw Error('漫画を取得できません');
   const data=await response.text();if(data.length>4*1024*1024)throw Error('作品データが大きすぎます');const manifest=validate(JSON.parse(data)) as Manifest;
   if(manifest.workId!==route.workId||manifest.episodeId!==route.episodeId)throw Error('作品と話が一致しません');
   const {Reader}=await import('./reader');root.render(<Reader manifest={manifest} base={base} catalog={catalog} workId={route.workId} format="manga" episodeId={route.episodeId}/>);return;
  }
  throw Error('ページが見つかりません');
 } catch(error){root.render(<main role="alert"><h1>作品を開けませんでした</h1><p>{error instanceof Error ? error.message : String(error)}</p><a href="/">作品一覧へ戻る</a></main>);}
}
start();
