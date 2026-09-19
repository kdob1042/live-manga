import {test,expect} from '@playwright/test';

const motionHit=page=>page.locator('.panel-hit-area');

test('shared reader shell puts work navigation in a collapsible sidebar',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.reader-shell')).not.toHaveClass(/sidebar-open/);
 await expect(page.locator('.reader-tabs')).toHaveCount(0);
 await expect(page.locator('.sidebar-close')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'読書メニューを閉じる'})).toHaveCount(0);
 await expect(page.locator('.sidebar-toggle')).toHaveText('‹');
 await expect(page.locator('.page-text')).toHaveCount(0);
 await expect(page.locator('.sidebar-text-reader')).toHaveCount(1);
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('.reader-shell')).toHaveClass(/sidebar-open/);
 await expect(page.getByRole('button',{name:'読書メニューを閉じる'})).toHaveCount(1);
 await expect(page.locator('.sidebar-toggle')).toHaveText('›');
 await expect(page.locator('.work-list .work-option')).toHaveCount(1);
 await expect(page.locator('.toc-list a')).toHaveCount(1);
 await expect(page.locator('.sidebar-text-reader')).toBeVisible();
 await page.locator('.sidebar-text-reader > summary').click();
 await expect(page.getByText('静かな午後。',{exact:true})).toBeVisible();
 await page.locator('.toc-list a').first().click();
 await expect(page.locator('.reader-shell')).not.toHaveClass(/sidebar-open/);
 await expect(page.locator('.sidebar-toggle')).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.sidebar-toggle')).toHaveText('‹');
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('.reader-shell')).toHaveClass(/sidebar-open/);
 await expect(page.locator('.sidebar-toggle')).toHaveText('›');
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('.reader-shell')).not.toHaveClass(/sidebar-open/);
});

test('motion panels expose only a subtle marker and the full panel is clickable',async({page})=>{
 await page.goto('/');
 await expect(page.locator('.panel-control,.expand-control')).toHaveCount(0);
 await expect(page.locator('.motion-marker')).toHaveCount(1);
 const motionBox=await page.locator('.motion').first().boundingBox();
 const hitBox=await motionHit(page).first().boundingBox();
 if(!motionBox||!hitBox)throw new Error('Expected the motion panel and its hit area to be visible');
 expect(hitBox.width).toBeGreaterThan(motionBox.width*.9);
 expect(hitBox.height).toBeGreaterThan(motionBox.height*.9);
 await page.mouse.click(motionBox.x+motionBox.width/2,motionBox.y+motionBox.height/2);
 await expect(page.locator('video')).toHaveCount(1);
});

test('short tap loads one video; natural end returns to poster without layout change',async({page})=>{
 const videos=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});
 await page.goto('/');
 await expect(page.locator('.page').first()).toBeVisible();
 expect(videos).toHaveLength(0);
 const rect=await page.locator('.page').boundingBox();
 await motionHit(page).first().click();
 await expect(page.locator('video')).toBeVisible();
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await page.screenshot({path:'test-results/reader-playing.png',fullPage:true});
 await expect(page.locator('video')).toHaveCount(0,{timeout:10000});
 expect(await page.locator('.page').boundingBox()).toEqual(rect);
 await page.locator('.sidebar-toggle').click();
 await page.locator('.sidebar-text-reader > summary').click();
 await expect(page.getByText('静かな午後。',{exact:true})).toBeVisible();
});

test('outside panel taps stop the active video while the marker stays at the top edge',async({page})=>{
 await page.goto('/');
 const hit=motionHit(page).first();
 await hit.click();
 await expect(page.locator('video')).toHaveCount(1);
 const marker=page.locator('.motion-marker').first(),motion=page.locator('.motion').first();
 const markerBox=await marker.boundingBox(),motionBox=await motion.boundingBox();
 if(!markerBox||!motionBox)throw new Error('Expected the motion marker and panel to be visible');
 const markerCenter=markerBox.x+markerBox.width/2,motionCenter=motionBox.x+motionBox.width/2;
 expect(markerBox.width).toBeGreaterThanOrEqual(14);
 expect(markerBox.height).toBeGreaterThanOrEqual(2);
 expect(Math.abs(markerCenter-motionCenter)).toBeLessThan(2);
 expect(markerBox.y).toBeGreaterThan(motionBox.y+motionBox.height-8);
 expect(markerBox.y).toBeLessThan(motionBox.y+motionBox.height+8);
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('video')).toHaveCount(0);
});

test('404 and play rejection preserve the readable page and permit retry',async({page})=>{
 await page.route('**/*.mp4',r=>r.fulfill({status:404}));
 await page.goto('/');
 await motionHit(page).first().click();
 await expect(page.getByRole('status')).toContainText('再試行');
 await expect(page.locator('video')).toHaveCount(0);
 await expect(page.locator('.page')).toBeVisible();
 await page.unroute('**/*.mp4');
 await page.evaluate(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('denied'));});
 await motionHit(page).first().click();
 await expect(page.getByRole('status')).toContainText('再試行');
});

test('reduced motion never fetches video; mobile layout remains within the viewport',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await page.locator('.sidebar-toggle').click();
 await expect(page.getByText('静止漫画として読む',{exact:true})).toHaveCount(0);
 await expect(page.locator('.panel-hit-area')).toHaveCount(1);
 await expect(page.locator('video')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.screenshot({path:'test-results/reader-mobile.png',fullPage:true});
});

test('switching panels and stale play promises cannot restart old playback',async({page})=>{
 await page.route('**/live-manga.json',async route=>{const response=await route.fetch(),m=await response.json();m.pages[0].panels[0].motion=m.pages[0].panels[1].motion;await route.fulfill({json:m});});
 await page.goto('/');
 const hits=motionHit(page);
 await hits.nth(0).click();
 await hits.nth(1).click();
 await expect(page.locator('video')).toHaveCount(1);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await hits.nth(0).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('video')).toHaveCount(1);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
 await expect(page.locator('video')).toHaveCount(0);
});

test('late play resolution is ignored after another panel starts',async({page})=>{
 await page.route('**/live-manga.json',async r=>{const res=await r.fetch(),m=await res.json();m.pages[0].panels[0].motion=m.pages[0].panels[1].motion;await r.fulfill({json:m});});
 await page.goto('/');
 await page.evaluate(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const p=play.call(this);return p.then(()=>new Promise(resolve=>{window.releasePlay=resolve;}));};});
 const hits=motionHit(page);
 await hits.nth(0).click();
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await page.evaluate(()=>{window.oldPlay=window.releasePlay;});
 await hits.nth(1).click();
 await page.evaluate(()=>window.oldPlay());
 await expect(page.locator('video')).toHaveCount(1);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
});

test('PC second click opens one large modal video and restores focus on close',async({page})=>{
 await page.goto('/');
 const hit=motionHit(page).first();
 await hit.click();
 await expect(page.locator('video')).toHaveCount(1);
 await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await hit.click();
 const dialog=page.getByRole('dialog',{name:/拡大動画/});
 await expect(dialog).toBeVisible();
 await expect(dialog.locator('video')).toHaveCount(1);
 await expect(dialog.locator('video')).toHaveAttribute('controls','');
 await expect.poll(()=>dialog.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
 await page.getByRole('button',{name:'拡大動画を閉じる'}).click();
 await expect(dialog).not.toBeVisible();
 await expect(page.locator('video')).toHaveCount(0);
 await expect(hit).toBeFocused();
});

test('touch short tap plays and touch long press opens modal while drag remains scrolling input',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 const hit=motionHit(page).first(),box=await hit.boundingBox();
 if(!box)throw new Error('Expected the motion hit area to be visible');
 const point={pointerType:'touch',button:0,clientX:box.x+box.width/2,clientY:box.y+box.height/2};
 await hit.dispatchEvent('pointerdown',point);
 await hit.dispatchEvent('pointerup',point);
 await hit.dispatchEvent('click',{detail:1,clientX:point.clientX,clientY:point.clientY});
 await expect(page.locator('video')).toHaveCount(1);
 await page.locator('video').evaluate(v=>v.pause());
 await hit.dispatchEvent('pointerdown',point);
 await page.waitForTimeout(500);
 const dialog=page.getByRole('dialog',{name:/拡大動画/});
 await expect(dialog).toBeVisible();
 await hit.dispatchEvent('pointerup',point);
 await page.getByRole('button',{name:'拡大動画を閉じる'}).click();
 await expect(dialog).not.toBeVisible();
 const moved={...point,clientX:point.clientX+40,clientY:point.clientY+40};
 await hit.dispatchEvent('pointerdown',point);
 await hit.dispatchEvent('pointermove',moved);
 await page.waitForTimeout(500);
 await hit.dispatchEvent('pointerup',moved);
 await expect(dialog).not.toBeVisible();
});

test('failed overlay falls back to the completed page and removes its motion hit area',async({page})=>{
 await page.setViewportSize({width:1100,height:500});
 await page.goto('/');
 const overlay=await page.locator('.overlay').getAttribute('src');
 await page.route('**'+overlay,r=>r.fulfill({status:404}));
 await page.reload();
 await expect(page.locator('.overlay')).toHaveCount(0);
 await expect(page.locator('.panel-hit-area')).toHaveCount(0);
 await expect.poll(()=>page.locator('.page img').evaluate(im=>im.complete&&im.naturalWidth>0)).toBe(true);
 await page.unroute('**'+overlay);
 await page.reload();
 await motionHit(page).first().click();
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 await expect(page.locator('video')).toHaveCount(0);
});
