import { S3Client,GetObjectCommand,PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';import { createHash } from 'node:crypto';
import {publish,rollback} from './publish-core.mjs';
const [directory,release,...flags]=process.argv.slice(2),apply=flags.includes('--apply');
if(!directory||!release)throw Error('Usage: node scripts/publish.mjs PACKAGE RELEASE [--apply] | --rollback RELEASE --apply');
function remote() {
 const {R2_ACCOUNT_ID,R2_BUCKET,AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY}=process.env;
 if(!/^[a-f0-9]{32}$/.test(R2_ACCOUNT_ID??'')||!R2_BUCKET||!AWS_ACCESS_KEY_ID||!AWS_SECRET_ACCESS_KEY)throw Error('R2_ACCOUNT_ID, R2_BUCKET and dedicated R2 S3 credentials are required');
 const client=new S3Client({endpoint:`https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,region:'auto',credentials:{accessKeyId:AWS_ACCESS_KEY_ID,secretAccessKey:AWS_SECRET_ACCESS_KEY},maxAttempts:1,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
 const send=command=>client.send(command,{abortSignal:AbortSignal.timeout(120000)});
 return {
  async catalog(){try{const r=await send(new GetObjectCommand({Bucket:R2_BUCKET,Key:'catalog.json'}));if(r.ContentLength>1024*1024)throw Error('Catalog too large');const value=JSON.parse(await r.Body.transformToString());if(!Array.isArray(value.releases)||value.releases.some(r=>typeof r!=='string'||!/^[a-zA-Z0-9:_-]{1,128}$/.test(r)))throw Error('Invalid catalog');return {value,etag:r.ETag};}catch(e){if(e.$metadata?.httpStatusCode===404)return null;throw e;}},
  async putImmutable(key,path,meta){try{await send(new PutObjectCommand({Bucket:R2_BUCKET,Key:key,Body:createReadStream(path),ContentLength:meta.bytes,ContentType:meta.mime,CacheControl:'public, max-age=31536000, immutable',IfNoneMatch:'*'}));}catch(e){if(e.$metadata?.httpStatusCode!==412)throw e;}},
  async hash(key,size){const r=await send(new GetObjectCommand({Bucket:R2_BUCKET,Key:key}));if(r.ContentLength!==size)throw Error('Remote size mismatch');const h=createHash('sha256');let count=0;for await(const chunk of r.Body){count+=chunk.length;if(count>size){r.Body.destroy();throw Error('Remote bounds exceeded');}h.update(chunk);}if(count!==size)throw Error('Remote truncated');return h.digest('hex');},
  async setCatalog(value,etag){await send(new PutObjectCommand({Bucket:R2_BUCKET,Key:'catalog.json',Body:JSON.stringify(value),ContentType:'application/json',CacheControl:'no-cache',...(etag?{IfMatch:etag}:{IfNoneMatch:'*'})}));}
 };
}
if(directory==='--rollback'){if(!apply)throw Error('Rollback needs --apply');await rollback(remote(),release);console.log('Catalog now points to',release);}
else console.log(JSON.stringify(await publish(directory,apply?remote():null,{release,apply}),null,2));
