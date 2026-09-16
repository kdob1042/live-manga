import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for(const dir of ['contracts','scripts','tests','src'])for(const f of readdirSync(dir))if(f.endsWith('.mjs'))execFileSync(process.execPath,['--check',`${dir}/${f}`],{stdio:'inherit'});
