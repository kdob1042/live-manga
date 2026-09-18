import React from 'react';
import type {Preview} from '../contracts/preview-types';
import {previewTags,tagKey} from '../contracts/preview.mjs';
export default function PreviewControls({preview,selected,mode,onChange,count}:{preview:Preview;selected:string[];mode:'any'|'all';onChange:(tags:string[],mode:'any'|'all')=>void;count:number}){
 const tags=previewTags(preview) as string[];
 return <aside className="preview-controls" aria-label="制作途中の表示設定">
  <p><strong>制作途中</strong> · 保存時点 {preview.savedAt}</p>
  <fieldset><legend>シーンのタグで表示を絞る</legend>
   {tags.length?tags.map(tag=><label key={tagKey(tag)}><input type="checkbox" checked={selected.some(t=>tagKey(t)===tagKey(tag))} onChange={e=>onChange(e.target.checked?[...selected,tag]:selected.filter(t=>tagKey(t)!==tagKey(tag)),mode)}/>{tag}</label>):<p>タグはありません。全体を表示しています。</p>}
   <label>条件<select aria-label="タグの一致条件" value={mode} onChange={e=>onChange(selected,e.target.value as 'any'|'all')}><option value="any">いずれかに一致</option><option value="all">すべてに一致</option></select></label>
   <button type="button" disabled={!selected.length} onClick={()=>onChange([],mode)}>絞り込みを解除</button>
  </fieldset>
  <p role="status">{selected.length?`該当シーンを含む ${count} ページ`:`全 ${count} ページ`}</p>
  {!!selected.length&&<p>ページ内の他のシーンも元の配置のまま表示します。表示の絞り込みは共有範囲・アクセス権の設定ではありません。</p>}
 </aside>;
}
