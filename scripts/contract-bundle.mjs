import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';import {sha256} from '../contracts/package.mjs';
const paths=['contracts/validate.mjs','contracts/schema.json','contracts/types.ts','contracts/package.mjs','scripts/fixture.mjs','scripts/fixture_overlay.py'];const files={};
for(const p of paths){await mkdir('dist-contract/'+p.split('/')[0],{recursive:true});await copyFile(p,'dist-contract/'+p);files[p]=sha256(await readFile(p));}
await writeFile('dist-contract/checksums.json',JSON.stringify({version:'1.0.0',files},null,2));
