import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validate} from '../contracts/validate.mjs';
import {validatePreview, previewMatches, previewTags} from '../contracts/preview.mjs';
import {handlePreview} from '../src/preview-worker.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const imageId=sha(image),writer='w'.repeat(43),reader='r'.repeat(43);
export function fixture(id='one') {
 const panel=(id)=>({id,frame:{x:0,y:0,width:1,height:1},artRect:{x:0,y:0,width:1,height:1},poster:imageId,text:''});
 return {format:'live-manga-preview',schemaVersion:'1.0.0',savedAt:'2026-09-17T00:00:00.000Z',
 manifest:{format:'live-manga',schemaVersion:'1.0.0',releaseId:id,workId:'work',episodeId:'ep',title:'人工プレビュー',language:'ja',assets:[{id:imageId,path:`assets/${imageId}.png`,sha256:imageId,mime:'image/png',bytes:image.length,width:1,height:1}],pages:[{id:'page1',width:1,height:1,art:imageId,overlay:imageId,fallback:imageId,panels:[panel('p1'),panel('p2')]},{id:'page2',width:1,height:1,art:imageId,overlay:imageId,fallback:imageId,panels:[panel('p3')]}]},
 scenes:[{id:'a',tags:['雨']},{id:'b',tags:['図書館']}],panels:[{id:'p1',sceneIds:['a'],art:'ready',lettering:'none',motion:'none'},{id:'p2',sceneIds:['b'],art:'pending',lettering:'pending',motion:'none'},{id:'p3',sceneIds:[],art:'ready',lettering:'none',motion:'none'}]};
}
class FakeR2 {
 objects=new Map();counter=0;failStateOnce=false;
 async put(key,input,options={}) {
  const bytes=typeof input==='string'?Buffer.from(input):Buffer.from(await new Response(input).arrayBuffer());
  const previous=this.objects.get(key);
  if(options.onlyIf?.etagDoesNotMatch==='*' && previous || options.onlyIf?.etagMatches && options.onlyIf.etagMatches!==previous?.etag)return null;
  if(options.sha256 && sha(bytes)!==options.sha256)throw Error('checksum mismatch');
  if(this.failStateOnce && key.includes('/transfers/') && JSON.parse(bytes.toString()).committed){this.failStateOnce=false;throw Error('after pointer');}
  const object={bytes,size:bytes.length,etag:String(++this.counter),httpEtag:`"${this.counter}"`,customMetadata:options.customMetadata??{}};
  this.objects.set(key,object);return {...object};
 }
 async head(key){const v=this.objects.get(key);return v?{...v}:null;}
 async get(key,options={}) {
  const value=this.objects.get(key);if(!value)return null;
  if(options.onlyIf?.etagMatches && options.onlyIf.etagMatches!==value.etag)return {...value};
  const bytes=options.range?value.bytes.subarray(options.range.offset,options.range.offset+options.range.length):value.bytes;
  return {...value,body:new Response(bytes).body,json:async()=>JSON.parse(value.bytes.toString())};
 }
}
function setup(){const env={MEDIA:new FakeR2(),PREVIEWS_PRIVATE:'true',PREVIEW_KEYS:JSON.stringify([{sha256:sha(writer),workId:'work',episodeId:'ep',permissions:['write'],expiresAt:'2099-01-01T00:00:00.000Z'},{sha256:sha(reader),workId:'work',episodeId:'ep',permissions:['read'],expiresAt:'2099-01-01T00:00:00.000Z'}])};
 const send=(path,method='GET',body,token=writer,headers={})=>handlePreview(new Request(`https://reader.test${path}`,{method,headers:{...(token?{Authorization:`Bearer ${token}`} :{}),...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body)}:{})}),env);return {env,send};}
const root='/previews/work/ep/';
async function upload(send,preview,baseRevision=null){const id=preview.manifest.releaseId;assert.equal((await send(root+'transfers/'+id,'PUT',{preview,baseRevision})).status,201);assert.equal((await send(root+`transfers/${id}/assets/${imageId}.png`,'PUT',image,writer,{'Content-Type':'image/png','Content-Length':String(image.length)})).status,200);}
test('metadata is strict and AND operates on one scene',()=>{
 const p=fixture(),before=JSON.stringify(p);validatePreview(p);assert.throws(()=>validate(p));
 assert.deepEqual(previewTags(p),['雨','図書館']);assert.deepEqual(previewMatches(p,['雨','図書館'],'all').pageIds,[]);
 assert.deepEqual(previewMatches(p,['雨']).pageIds,['page1']);assert.deepEqual(previewMatches(p,[]).pageIds,['page1','page2']);assert.equal(JSON.stringify(p),before);
 for(const change of [p=>p.scenes[0].rawSource='secret',p=>p.panels[0].sceneIds=['unknown'],p=>p.panels.pop(),p=>p.panels[0].motion='ready',p=>p.scenes[0].tags=[''],p=>p.scenes.push({id:'unused',tags:[]})]){const bad=fixture();change(bad);assert.throws(()=>validatePreview(bad));}
});
test('begin, checked upload, finalize and authenticated read of one immutable revision',async()=>{
 const {send}=setup(),p=fixture();await upload(send,p);
 assert.equal((await send(root+'revisions/one/live-manga.json','GET',undefined,reader)).status,404);
 const done=await send(root+'transfers/one/commit','POST');assert.equal(done.status,200);assert.equal((await done.json()).committed,true);
 const manifest=await send(root+'revisions/one/live-manga.json','GET',undefined,reader);assert.equal(manifest.status,200);assert.deepEqual(await manifest.json(),p);
 const path=root+`revisions/one/assets/${imageId}.png`;
 assert.equal((await send(path,'GET',undefined,null)).status,401);assert.equal((await send(path,'HEAD',undefined,writer)).status,403);
 const ranged=await send(path,'GET',undefined,reader,{Range:'bytes=0-7'});assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,8);assert.match(ranged.headers.get('Cache-Control'),/no-store/);
 assert.equal((await send(path,'GET',undefined,reader,{Range:'bytes=10000-'})).status,416);
 assert.equal((await send(root+'transfers/one/commit','POST')).status,200);
});
test('older competing transfer cannot replace a newer preview',async()=>{
 const {send}=setup();await upload(send,fixture());await send(root+'transfers/one/commit','POST');
 await upload(send,fixture('two'),'one');await upload(send,fixture('three'),'one');
 assert.equal((await send(root+'transfers/three/commit','POST')).status,200);assert.equal((await send(root+'transfers/two/commit','POST')).status,409);
 assert.equal((await (await send(root+'current.json','GET',undefined,reader)).json()).revision,'three');
 assert.equal((await send(root+'revisions/one/live-manga.json','GET',undefined,reader)).status,200);
});
test('missing, corrupt, unknown assets and reused ID are rejected',async()=>{
 const {send}=setup(),p=fixture();await send(root+'transfers/one','PUT',{preview:p,baseRevision:null});
 assert.equal((await send(root+'transfers/one/commit','POST')).status,409);
 assert.equal((await send(root+`transfers/one/assets/${imageId}.png`,'PUT',Buffer.alloc(image.length),writer,{'Content-Type':'image/png','Content-Length':String(image.length)})).status,400);
 p.manifest.title='changed';assert.equal((await send(root+'transfers/one','PUT',{preview:p,baseRevision:null})).status,409);
 assert.equal((await send(root+'revisions/one/live-manga.json','GET',undefined,reader)).status,404);
});
test('read cookie never authorizes writes; expiry and scope are rechecked on HEAD/Range',async()=>{
 const {send,env}=setup();const response=await send('/preview-session','POST',{workId:'work',episodeId:'ep',token:reader},null,{Origin:'https://reader.test'});
 assert.equal(response.status,200);const cookie=response.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 assert.equal((await send(root+'transfers/one','PUT',{preview:fixture(),baseRevision:null},null,{Cookie:cookie})).status,401);
 assert.equal((await send('/previews/other/ep/current.json','HEAD',undefined,reader)).status,403);
 assert.equal((await send('/preview-session','POST',{workId:'work',episodeId:'ep',token:reader},null,{Origin:'https://other.test'})).status,403);
 env.PREVIEW_KEYS='[]';assert.equal((await send(root+'current.json','HEAD',undefined,null,{Cookie:cookie})).status,403);
 env.PREVIEWS_PRIVATE='false';assert.equal((await send(root+'current.json','GET',undefined,reader)).status,503);
});
test('lost final receipt resumes using the same transfer, without reupload',async()=>{
 const {send,env}=setup();await upload(send,fixture());env.MEDIA.failStateOnce=true;
 assert.equal((await send(root+'transfers/one/commit','POST')).status,503);
 assert.equal((await (await send(root+'transfers/one')).json()).missing.length,0);
 assert.equal((await send(root+'transfers/one/commit','POST')).status,200);
});
