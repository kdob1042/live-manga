import { validate } from '../contracts/validate.mjs';
import {parseRange} from './http-range.mjs';
export {parseRange} from './http-range.mjs';
import {handlePreview} from './preview-worker.mjs';
export default {async fetch(request,env) {
 const preview=await handlePreview(request,env);if(preview)return preview;
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const url=new URL(request.url);
 if(url.pathname==='/catalog.json'){
  if(!env.MEDIA)return new Response(null,{status:404});const object=await env.MEDIA.get('catalog.json');if(!object)return new Response(null,{status:404});if(object.size>1024*1024)return new Response(null,{status:502});
  const catalog=await object.json();if(!Array.isArray(catalog.releases)||!catalog.releases.includes(catalog.current)||!/^[a-zA-Z0-9:_-]{1,128}$/.test(catalog.current))return new Response(null,{status:502});
  return new Response(request.method==='HEAD'?null:JSON.stringify({current:catalog.current}),{headers:{'Content-Type':'application/json','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
 }
 if(!url.pathname.startsWith('/releases/'))return env.ASSETS.fetch(request);
 const m=/^\/releases\/([a-zA-Z0-9:_-]{1,128})\/(live-manga\.json|assets\/[a-f0-9]{64}\.(?:png|jpg|webp|mp4))$/.exec(url.pathname);
 if(!m||!env.MEDIA)return new Response(null,{status:404});
 const catalog=await env.MEDIA.get('catalog.json');if(!catalog)return new Response(null,{status:404});if(catalog.size>1024*1024)return new Response(null,{status:502});
 const entries=await catalog.json();if(!Array.isArray(entries.releases)||!entries.releases.includes(m[1]))return new Response(null,{status:404});
 const prefix=`releases/${m[1]}/`,manifestObject=await env.MEDIA.get(prefix+'live-manga.json');if(!manifestObject||manifestObject.size>4*1024*1024)return new Response(null,{status:404});
 let manifest;try{manifest=validate(await manifestObject.json());if(manifest.releaseId!==m[1])throw Error();}catch{return new Response(null,{status:502});}
 const asset=m[2]==='live-manga.json'?null:manifest.assets.find(a=>a.path===m[2]);if(m[2]!=='live-manga.json'&&!asset)return new Response(null,{status:404});
 const key=prefix+m[2],head=await env.MEDIA.head(key);if(!head||asset&&head.size!==asset.bytes)return new Response(null,{status:404});
 const headers=new Headers({'Content-Type':asset?.mime??'application/json','Content-Length':String(head.size),'ETag':head.httpEtag,'Accept-Ranges':'bytes','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
 const match=request.headers.get('If-None-Match');if(match&&(match==='*'||match.split(',').map(s=>s.trim().replace(/^W\//,'')).includes(head.httpEtag)))return new Response(null,{status:304,headers:{ETag:head.httpEtag,'Cache-Control':headers.get('Cache-Control')}});
 let range=null;const value=request.headers.get('Range'),ifRange=request.headers.get('If-Range');
 if(request.method==='GET'&&value&&(!ifRange||ifRange===head.httpEtag)){range=parseRange(value,head.size);if(!range)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${head.size}`}});headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${head.size}`);headers.set('Content-Length',String(range.length));}
 if(request.method==='HEAD')return new Response(null,{headers});
 const object=await env.MEDIA.get(key,{...(range?{range}:{}),onlyIf:{etagMatches:head.etag}});
 if(!object||!object.body)return new Response(null,{status:503});
 return new Response(object.body,{status:range?206:200,headers});
}};
