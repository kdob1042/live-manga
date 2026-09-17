// Produce the package through manga-mac's real browser/native path and copy bytes unchanged.
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,cp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {verifyPackage} from '../contracts/package.mjs';
const producer=process.argv[2];if(!producer)throw Error('Provide the pinned manga-mac checkout');
const temp=await mkdtemp(join(tmpdir(),'live-reader-acceptance-')),result=join(temp,'result.json');
let target;
try{
 execFileSync(process.execPath,['scripts/live-e2e.mjs'],{cwd:resolve(producer),env:{...process.env,LIVE_MANGA_E2E_RESULT:result,LIVE_MANGA_E2E_OUTPUT:join(temp,'export')},stdio:'inherit'});
 const output=JSON.parse(await readFile(result)),manifest=await verifyPackage(output.path);
 if(manifest.schemaVersion!=='2.0.0'||JSON.stringify(manifest.pages.map(p=>p.panels.length))!=='[4,6]')throw Error('Expected real mixed-layout v2 output');
 target=join('public','releases',manifest.releaseId);await mkdir('public/releases',{recursive:true});await cp(output.path,target,{recursive:true,errorOnExist:true,force:false});
 for(const file of ['live-manga.json',...manifest.assets.map(a=>a.path)])if(!(await readFile(join(target,file))).equals(await readFile(join(output.path,file))))throw Error('Reader input was modified');
 execFileSync('npx',['playwright','test','tests/ui/exporter.spec.js'],{env:{...process.env,LIVE_MANGA_E2E_RELEASE:manifest.releaseId},stdio:'inherit'});
}finally{if(target)await rm(target,{recursive:true,force:true});await rm(temp,{recursive:true,force:true});}
