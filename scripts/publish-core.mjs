import {verifyPackage,sha256} from '../contracts/package.mjs';
import {readFile} from 'node:fs/promises';import {join} from 'node:path';
export async function publish(directory,store,{apply=false,release}={}) {
 const manifest=await verifyPackage(directory);if(release!==manifest.releaseId)throw Error('Explicit releaseId must match package');
 const files=[...manifest.assets.map(a=>({path:a.path,bytes:a.bytes,hash:a.sha256,mime:a.mime})),{path:'live-manga.json',mime:'application/json'}];
 const manifestBytes=await readFile(join(directory,'live-manga.json'));Object.assign(files.at(-1),{bytes:manifestBytes.length,hash:sha256(manifestBytes)});
 const plan={releaseId:release,files:files.map(({path,bytes})=>({path,bytes})),bytes:files.reduce((n,f)=>n+f.bytes,0)};if(!apply)return plan;
 const before=await store.catalog();
 for(const f of files) {
  const key=`releases/${release}/${f.path}`;
  // Verify again immediately before upload; readback detects mutations during transfer.
  await store.putImmutable(key,join(directory,f.path),f);
  if(await store.hash(key,f.bytes)!==f.hash)throw Error('Remote readback hash mismatch; catalog unchanged');
 }
 const next={releases:[...new Set([...(before?.value.releases??[]),release])],current:release};
 await store.setCatalog(next,before?.etag??null);return {...plan,published:true};
}
export async function rollback(store,release) {
 const before=await store.catalog();if(!before?.value.releases.includes(release))throw Error('Unknown published release');
 await store.setCatalog({...before.value,current:release},before.etag);
}
