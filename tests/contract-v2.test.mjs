import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate,VERSION} from '../contracts/validate.mjs';
const legacy=JSON.parse(await readFile('public/demo/live-manga.json'));
function v2(){const m=structuredClone(legacy);m.schemaVersion=VERSION;for(const p of m.pages[0].panels){const {x,y,width:w,height:h}=p.frame;p.clip=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}return m;}
test('v1 remains valid; v2 supports a slanted crop extending beyond the page',()=>{
 validate(legacy);const m=v2(),p=m.pages[0].panels[0],f=p.frame;
 p.clip[0][0]+=40;p.clip[2][0]-=40;
 const a=m.assets.find(a=>a.id===p.poster),w=f.height*a.width/a.height*2;
 p.artRect={x:f.x-w/4,y:f.y-f.height/2,width:w,height:f.height*2};
 validate(m);
});
test('version-specific fields, convexity, exact bounds and media transform are enforced',()=>{
 const cases=[m=>delete m.pages[0].panels[0].clip,m=>m.schemaVersion='1.0.0',m=>m.pages[0].panels[0].clip.reverse(),m=>m.pages[0].panels[0].clip[2]=m.pages[0].panels[0].clip[0],m=>m.pages[0].panels[0].clip[0][0]=-1,m=>m.pages[0].panels[0].clip[0].push(7),m=>m.pages[0].panels[0].frame.width++,m=>m.pages[0].panels[0].artRect.x=Infinity,m=>m.pages[0].panels[0].artRect.x=-1e12,m=>m.pages[0].panels[0].artRect.x-=50,m=>m.pages[0].panels[0].clip[0][0]='60',m=>m.pages[0].panels[0].motion={...m.pages[0].panels[1].motion,api_key:'private'},m=>m.pages[0].panels[0].private='secret'];
 for(const mutate of cases){const m=v2();mutate(m);assert.throws(()=>validate(m));}
});
test('v2 supports mixed page counts and rejects unsupported versions',()=>{
 const m=v2(),second=structuredClone(m.pages[0]);second.id='second';second.panels=[...second.panels,structuredClone(second.panels[0]),structuredClone(second.panels[1])];second.panels.forEach((p,i)=>p.id=`second-${i}`);m.pages.push(second);validate(m);assert.deepEqual(m.pages.map(p=>p.panels.length),[4,6]);m.schemaVersion='3.0.0';assert.throws(()=>validate(m));
});
