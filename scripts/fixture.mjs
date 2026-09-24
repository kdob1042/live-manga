import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { sha256, probe, verifyPackage } from '../contracts/package.mjs';
const root='public/demo';await rm(root,{recursive:true,force:true});await mkdir(root+'/assets',{recursive:true});
const assets=[];
async function make(name,filter,width,height,video=false) {
 const tmp=`/tmp/live-manga-fixture-${process.pid}-${name}.${video?'mp4':'png'}`;
 execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i',filter,...(video?['-t','5','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart']:['-frames:v','1','-threads','1']),tmp]);
 const bytes=await readFile(tmp),hash=sha256(bytes),ext=video?'mp4':'png';
 await writeFile(`${root}/assets/${hash}.${ext}`,bytes);
 const a={id:hash,path:`assets/${hash}.${ext}`,sha256:hash,mime:video?'video/mp4':'image/png',bytes:bytes.length,width,height};
 if(video)Object.assign(a,{duration:probe(tmp).duration,codec:'h264',audio:false});assets.push(a);return hash;
}
const seed=`/tmp/live-seed-${process.pid}.png`;
execFileSync('ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=0xF2EEE5:s=748x1010','-frames:v','1','-threads','1',seed]);
async function addPNG(file,width,height) {const b=await readFile(file),h=sha256(b);await writeFile(`${root}/assets/${h}.png`,b);assets.push({id:h,path:`assets/${h}.png`,sha256:h,mime:'image/png',bytes:b.length,width,height});return h;}
const artFile=`/tmp/live-art-${process.pid}.png`,overlayFile=`/tmp/live-overlay-${process.pid}.png`,fallbackFile=`/tmp/live-fallback-${process.pid}.png`;
execFileSync('python3',['scripts/fixture_overlay.py',overlayFile,fallbackFile,seed,artFile]);
const art=await addPNG(artFile,748,1010),overlay=await addPNG(overlayFile,748,1010),fallback=await addPNG(fallbackFile,748,1010);
const poster1=await make('poster-1','color=c=0xE3E8E9:s=470x470',470,470);
const poster2=await make('poster-2','color=c=0xE3E8E9:s=278x470',278,470);
const poster3=await make('poster-3','color=c=0xE3E8E9:s=240x240',240,240);
const poster4=await make('poster-4','color=c=0xE8E7E1:s=508x240',508,240);
const poster5=await make('poster-5','color=c=0xE3E8E9:s=748x300',748,300);
const video=await make('motion',"color=c=0xE3E8E9:s=278x470:r=24[bg];color=c=0x27343C:s=54x54:r=24[box];[bg][box]overlay=x='110+45*sin(t*2)':y='200+70*cos(t*1.6)':shortest=1",278,470,true);
const panels=[
 {id:'panel-1',frame:{x:0,y:0,width:470,height:470},artRect:{x:0,y:0,width:470,height:470},poster:poster1,text:'静かな午後。'},
 {id:'panel-2',frame:{x:470,y:0,width:278,height:470},artRect:{x:470,y:0,width:278,height:470},poster:poster2,text:'ひとつのコマに、触れてみる。',motion:{asset:video,end:'poster'}},
 {id:'panel-3',frame:{x:0,y:470,width:240,height:240},artRect:{x:0,y:470,width:240,height:240},poster:poster3,text:'視線が、こちらを向く。'},
 {id:'panel-4',frame:{x:240,y:470,width:508,height:240},artRect:{x:240,y:470,width:508,height:240},poster:poster4,text:'言葉になる前の間。'},
 {id:'panel-5',frame:{x:0,y:710,width:748,height:300},artRect:{x:0,y:710,width:748,height:300},poster:poster5,text:'続きは、自分のペースで.'}
];
await writeFile(`${root}/live-manga.json`,JSON.stringify({format:'live-manga',schemaVersion:'1.0.0',releaseId:'demo-v1',workId:'demo',episodeId:'one',title:'触れると、動き出す。',language:'ja',pages:[{id:'page-1',width:748,height:1010,art,overlay,fallback,panels}],assets},null,2));
await verifyPackage(root);console.log('Verified gapless variable manga-like 5-panel / 5-second fixture');

const manifest=JSON.parse(await readFile(root+'/live-manga.json','utf8'));const files={};for(const a of manifest.assets)files[a.path]=(await readFile(root+'/'+a.path)).toString('base64');await writeFile('contracts/fixture-assets.json',JSON.stringify({manifest,files})+'\n');
