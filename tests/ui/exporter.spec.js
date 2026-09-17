import {test,expect} from '@playwright/test';
const release=process.env.LIVE_MANGA_E2E_RELEASE;
// Integer 1:1 page pixels avoid comparing different scroll/subpixel resampling phases.
test.use({viewport:{width:1800,height:2700}});
test.beforeEach(async({page})=>{
 test.skip(!release,'Run scripts/exporter-acceptance.mjs with the pinned manga-mac checkout');
 await page.goto('/?release='+release);
 await expect(page.getByRole('heading',{level:1})).toHaveText('Artificial 4/6-panel crop calibration');
 await expect(page.locator('.page')).toHaveCount(2);
 await page.addStyleTag({content:'.page{width:1600px;height:2260px}main{max-width:1640px}.panel-control span,.expand-control{visibility:hidden}.panel-control:focus-visible{outline:none}'});
 await expect.poll(()=>page.locator('.page img').evaluateAll(images=>images.every(im=>im.complete&&im.naturalWidth>0))).toBe(true);
});
async function difference(page,a,b){
 return page.evaluate(async([a,b])=>{
  async function pixels(src){const im=new Image();im.src='data:image/png;base64,'+src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,c.width,c.height).data;}
  const [x,y]=await Promise.all([pixels(a),pixels(b)]);if(x.length!==y.length)return 1;
  let different=0;for(let i=0;i<x.length;i+=4)if([0,1,2].some(k=>Math.abs(x[i+k]-y[i+k])>24))different++;
  return different/(x.length/4);
 },[a.toString('base64'),b.toString('base64')]);
}
for(const [index,panelId] of [[0,'s:p0'],[0,'s:p1'],[1,'s:p4']])test(`unaltered native package: ${panelId} still/video/return share the same crop`,async({page})=>{
 const surface=page.locator('.page').nth(index);await surface.scrollIntoViewIfNeeded();
 const manifest=await (await page.request.get(`/releases/${release}/live-manga.json`)).json();
 expect(manifest.schemaVersion).toBe('2.0.0');expect(manifest.pages.map(p=>p.panels.length)).toEqual([4,6]);
 const panel=manifest.pages[index].panels.find(p=>p.id===panelId),host=page.locator(`[id="motion-${panelId}"]`);
 const action=host.locator('..').locator('xpath=following-sibling::div[1]').locator('.panel-control');
 await action.focus();
 const before=await surface.screenshot({path:test.info().outputPath("still.png")});
 await action.press('Enter');await expect(page.locator('video')).toHaveCount(1);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await page.locator('video').evaluate(v=>v.pause());
 const pageBox=await surface.boundingBox(),videoBox=await page.locator('video').boundingBox();
 const scale=pageBox.width/manifest.pages[index].width;
 for(const key of ['width','height'])expect(videoBox[key]).toBeCloseTo(panel.artRect[key]*scale,1);
 expect(videoBox.x-pageBox.x).toBeCloseTo(panel.artRect.x*scale,1);
 expect(videoBox.y-pageBox.y).toBeCloseTo(panel.artRect.y*scale,1);
 expect(await host.locator('..').evaluate(el=>getComputedStyle(el).clipPath)).toContain('polygon(');
 expect(await difference(page,before,await surface.screenshot({path:test.info().outputPath("playing.png")}))).toBeLessThan(.005);
 // Natural ended event, rather than programmatically removing the video node.
 await page.locator('video').evaluate(v=>{v.currentTime=v.duration-.15;return v.play();});
 await expect(page.locator('video')).toHaveCount(0,{timeout:10000});
 expect(await surface.screenshot()).toEqual(before);
});
test('slanted crop clips pointer hits; enlarged playback keeps the same transform',async({page})=>{
 const surface=page.locator('.page').first(),box=await surface.boundingBox();
 const manifest=await (await page.request.get(`/releases/${release}/live-manga.json`)).json(),pg=manifest.pages[0],p=pg.panels[0];
 const scale=box.width/pg.width;
 // Inside the frame rectangle but outside the clipped upper-left diagonal.
 await page.mouse.click(box.x+(p.frame.x+5)*scale,box.y+(p.frame.y+5)*scale);
 await expect(page.locator('video')).toHaveCount(0);
 const target=page.locator('[id="motion-s:p0"]').locator('..').locator('xpath=following-sibling::div[1]').locator('.panel-control');
 // Touch/long-press at the frame center, which is inside the convex quad.
 const x=box.x+(p.frame.x+p.frame.width/2)*scale,y=box.y+(p.frame.y+p.frame.height/2)*scale;
 await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();
 await expect(page.getByRole('dialog')).toBeVisible();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 const clip=page.locator('.modal-motion.cropped'),cb=await clip.boundingBox(),vb=await page.locator('video').boundingBox();
 expect(await clip.evaluate(e=>getComputedStyle(e).clipPath)).toContain('polygon(');
 expect((vb.x-cb.x)/cb.width).toBeCloseTo((p.artRect.x-p.frame.x)/p.frame.width,3);
 expect(vb.width/cb.width).toBeCloseTo(p.artRect.width/p.frame.width,3);
 await page.keyboard.press('Escape');await expect(page.locator('video')).toHaveCount(0);await expect(target).toBeFocused();
});

test('cropped video stops when its visible frame leaves the viewport',async({page})=>{
 const surface=page.locator('.page').first(),box=await surface.boundingBox();
 const manifest=await (await page.request.get(`/releases/${release}/live-manga.json`)).json();
 const panel=manifest.pages[0].panels[0];
 const host=page.locator('[id="motion-s:p0"]');
 await host.locator('..').locator('xpath=following-sibling::div[1]').locator('.panel-control').press('Enter');
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 // The clipped frame is gone, but the larger source rectangle still intersects the viewport.
 await page.evaluate(y=>window.scrollTo(0,y),box.y+panel.frame.y+panel.frame.height+5);
 await expect(page.locator('video')).toHaveCount(0);
});
