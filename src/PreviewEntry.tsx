import React,{useEffect,useState} from 'react';
import type {Preview} from '../contracts/preview-types';
import {validatePreview} from '../contracts/preview.mjs';
const id=/^[a-zA-Z0-9:_-]{1,128}$/;
export function parsePreviewLocation(href:string){
 const params=new URL(href).searchParams,raw=params.get('preview');
 if(raw===null)return null;
 const parts=raw.split('/'),revision=params.get('revision');
 if(parts.length!==2||!parts.every(p=>id.test(p))||(revision!==null&&!id.test(revision)))throw Error('プレビューの指定が不正です');
 return {workId:parts[0],episodeId:parts[1],revision};
}
class AuthError extends Error{}
async function getJSON(url:string){
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(response.status===401||response.status===403)throw new AuthError('閲覧用のキーが必要です');
 if(!response.ok)throw Error(response.status===404?'まだ転送済みのプレビューがありません':'プレビューを取得できませんでした');
 const text=await response.text();if(text.length>5*1024*1024)throw Error('プレビューが大きすぎます');return JSON.parse(text);
}
export default function PreviewEntry({scope,render}:{scope:{workId:string;episodeId:string;revision:string|null};render:(preview:Preview,base:string)=>React.ReactNode}){
 const [preview,setPreview]=useState<Preview|null>(null),[base,setBase]=useState(''),[error,setError]=useState(''),[login,setLogin]=useState(false),[key,setKey]=useState(''),[loading,setLoading]=useState(false);
 const prefix=`/previews/${scope.workId}/${scope.episodeId}/`;
 async function load(revision:string|null){
  setLoading(true);setError('');
  try{
   const target=revision??(await getJSON(prefix+'current.json')).revision;
   if(typeof target!=='string'||!id.test(target))throw Error('保存版が不正です');
   const nextBase=prefix+`revisions/${target}/`,next=validatePreview(await getJSON(nextBase+'live-manga.json')) as Preview;
   if(next.manifest.workId!==scope.workId||next.manifest.episodeId!==scope.episodeId||next.manifest.releaseId!==target)throw Error('作品と保存版が一致しません');
   setBase(nextBase);setPreview(next);setLogin(false);
  }catch(e){if(e instanceof AuthError)setLogin(true);setError(e instanceof Error?e.message:'取得できませんでした');}finally{setLoading(false);}
 }
 useEffect(()=>{void load(scope.revision);},[scope.workId,scope.episodeId,scope.revision]);
 async function authenticate(event:React.FormEvent){
  event.preventDefault();setLoading(true);setError('');const token=key;setKey('');
  try{const response=await fetch('/preview-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({workId:scope.workId,episodeId:scope.episodeId,token}),signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('閲覧用キー・有効期限・作品の権限を確認してください');await load(scope.revision);}catch(e){setError(e instanceof Error?e.message:'認証できませんでした');}finally{setLoading(false);}
 }
 return <><div className="preview-entry" aria-label="非公開プレビュー"><strong>非公開プレビュー</strong><button disabled={loading} onClick={()=>void load(null)}>最新版を開く</button>{loading&&<span role="status">確認中</span>}{error&&<p role="alert">{error}</p>}
 {login&&<form onSubmit={authenticate}><label>閲覧用キー<input type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} required/></label><button disabled={loading||!key}>開く</button><p>作者用の転送キーではなく、この作品の閲覧権限だけを持つキーを使用します。</p></form>}</div>
 {preview&&render(preview,base)}</>;
}
