import {test,expect} from '@playwright/test';
test('one transferred preview supports scene-local tag filters without POST or media changes',async({page,request})=>{
 const manifest=await (await request.get('/demo/live-manga.json')).json();manifest.workId='work';manifest.episodeId='ep';manifest.releaseId='one';
 const second=structuredClone(manifest.pages[0]);second.id='second';second.panels.forEach((p:any)=>{p.id+='-second';});manifest.pages=[manifest.pages[0],second];
 const preview={format:'live-manga-preview',schemaVersion:'1.0.0',savedAt:'2026-09-17T00:00:00.000Z',manifest,scenes:[{id:'rain',tags:['雨']},{id:'library',tags:['図書館']}],panels:manifest.pages.flatMap((p:any,i:number)=>p.panels.map((panel:any)=>({id:panel.id,sceneIds:[i?'library':'rain'],art:'ready',lettering:panel.text?'ready':'none',motion:panel.motion?'ready':'none'})))};
 const posts:string[]=[];page.on('request',r=>{if(!['GET','HEAD'].includes(r.method()))posts.push(r.url());});
 await page.route('**/previews/work/ep/**',async route=>{const path=new URL(route.request().url()).pathname;if(path.endsWith('current.json'))return route.fulfill({json:{revision:'one'}});if(path.endsWith('live-manga.json'))return route.fulfill({json:preview});const asset=path.slice(path.indexOf('assets/'));return route.fulfill({response:await request.get('/demo/'+asset)});});
 await page.goto('/?preview=work%2Fep&revision=one');await expect(page.locator('.page')).toHaveCount(2);await page.locator('.sidebar-toggle').click();
 await page.getByRole('checkbox',{name:'雨',exact:true}).check();await expect(page.locator('.page')).toHaveCount(1);await expect(page.locator('.folio')).toHaveText('01');
 await page.getByRole('checkbox',{name:'図書館',exact:true}).check();await page.getByLabel('タグの一致条件').selectOption('all');await expect(page.locator('.page')).toHaveCount(0);
 await page.getByRole('button',{name:'絞り込みを解除'}).click();await expect(page.locator('.page')).toHaveCount(2);expect(posts).toEqual([]);
 await page.getByRole('checkbox',{name:'図書館',exact:true}).check();await expect(page.locator('.folio')).toHaveText('02');
 await page.screenshot({path:'test-results/preview-tags.png',fullPage:true});
});
