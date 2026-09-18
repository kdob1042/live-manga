import {test,expect} from '@playwright/test';
test('shared reader shell puts work navigation in a collapsible sidebar',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('tab',{name:'作品'})).toHaveAttribute('aria-selected','true');
 await page.getByRole('tab',{name:'目次'}).click();
 await expect(page.locator('.toc-list a')).toHaveCount(1);
 await page.locator('.toc-list a').first().click();
 await expect(page.locator('.reader-shell')).not.toHaveClass(/sidebar-open/);
 await expect(page.locator('.sidebar-toggle')).toHaveAttribute('aria-expanded','false');
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('.reader-shell')).toHaveClass(/sidebar-open/);
 await page.locator('.sidebar-toggle').click();
 await expect(page.locator('.reader-shell')).not.toHaveClass(/sidebar-open/);
});

test('only panels with motion expose a compact playback button',async({page})=>{
 await page.goto('/');
 const control=page.locator('.panel-control');
 await expect(control).toHaveCount(1);
 const motionBox=await page.locator('.motion').first().boundingBox();
 const controlBox=await control.boundingBox();
 if(!motionBox||!controlBox)throw new Error('Expected the motion and playback button to be visible');
 expect(controlBox.width).toBeLessThan(motionBox.width/2);
 expect(controlBox.height).toBeLessThan(motionBox.height/2);
 await page.mouse.click(motionBox.x+motionBox.width/2,motionBox.y+motionBox.height/2);
 await expect(page.locator('video')).toHaveCount(0);
 await control.click();
 await expect(page.locator('video')).toHaveCount(1);
});

test('tap loads just one video; end returns to poster without layout change',async({page})=>{const videos=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))videos.push(r.url());});await page.goto('/');await expect(page.getByRole('heading',{level:1})).toBeVisible();expect(videos).toHaveLength(0);const rect=await page.locator('.page').boundingBox();await page.getByRole('button',{name:/再生/}).click();await expect(page.locator('video')).toBeVisible();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);await page.screenshot({path:'test-results/reader-playing.png',fullPage:true});await expect(page.locator('video')).toHaveCount(0,{timeout:10000});await expect(page.getByRole('status')).toContainText('▶');expect(await page.locator('.page').boundingBox()).toEqual(rect);await page.getByRole('checkbox').check();await expect(page.getByRole('button',{name:/再生/})).toHaveCount(0);await page.getByText('テキストで読む',{exact:true}).click();await expect(page.getByText('静かな午後。',{exact:true})).toBeVisible();});
test('404 and play rejection preserve readable page and permit retry',async({page})=>{await page.route('**/*.mp4',r=>r.fulfill({status:404}));await page.goto('/');await page.getByRole('button',{name:/再生/}).click();await expect(page.getByRole('status')).toContainText('再試行');await expect(page.locator('video')).toHaveCount(0);await expect(page.locator('.page')).toBeVisible();await page.unroute('**/*.mp4');await page.evaluate(()=>{HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('denied'));});await page.getByRole('button',{name:/再生/}).click();await expect(page.getByRole('status')).toContainText('再試行');});
test('reduced motion never fetches video; mobile layout',async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('.sidebar-toggle').click();await expect(page.getByRole('checkbox')).toBeChecked();await expect(page.locator('video')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'test-results/reader-mobile.png',fullPage:true});});
test('switching panels and stale play promises cannot restart old playback',async({page})=>{await page.route('**/live-manga.json',async route=>{const response=await route.fetch(),m=await response.json();m.pages[0].panels[0].motion=m.pages[0].panels[1].motion;await route.fulfill({json:m});});await page.goto('/');const buttons=page.getByRole('button',{name:/再生/});await buttons.nth(0).click();await page.getByRole('button',{name:/再生/}).click();await expect(page.locator('video')).toHaveCount(1);await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);await page.getByRole('button',{name:/停止/}).click();await expect(page.locator('video')).toHaveCount(0);await page.getByRole('button',{name:/再生/}).first().focus();await page.keyboard.press('Enter');await expect(page.locator('video')).toHaveCount(1);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('video')).toHaveCount(0);});

test('failed overlay selects the completed page and offscreen playback stops',async({page})=>{
 await page.setViewportSize({width:1100,height:500});
 await page.goto('/');const overlay=await page.locator('.overlay').getAttribute('src');await page.route('**'+overlay,r=>r.fulfill({status:404}));await page.reload();await expect(page.locator('.overlay')).toHaveCount(0);await expect(page.getByRole('button',{name:/再生/})).toHaveCount(0);await expect.poll(()=>page.locator('.page img').evaluate(im=>im.complete&&im.naturalWidth>0)).toBe(true);
 await page.unroute('**'+overlay);await page.reload();await page.getByRole('button',{name:/再生/}).click();await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await expect(page.locator('video')).toHaveCount(0);
});
test('late play resolution is ignored after another panel starts',async({page})=>{
 await page.route('**/live-manga.json',async r=>{const res=await r.fetch(),m=await res.json();m.pages[0].panels[0].motion=m.pages[0].panels[1].motion;await r.fulfill({json:m});});await page.goto('/');await page.evaluate(()=>{const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){const p=play.call(this);return p.then(()=>new Promise(resolve=>{window.releasePlay=resolve;}));};});await page.getByRole('button',{name:/再生/}).first().click();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);await page.evaluate(()=>{window.oldPlay=window.releasePlay;});await page.getByRole('button',{name:/再生/}).click();await page.evaluate(()=>window.oldPlay());await expect(page.locator('video')).toHaveCount(1);await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);
});
test('expand control opens one large modal video and restores focus on close',async({page})=>{
 await page.goto('/');const expand=page.getByRole('button',{name:/動画を大きく表示/});await expand.click();const dialog=page.getByRole('dialog',{name:/拡大動画/});await expect(dialog).toBeVisible();await expect(dialog.locator('video')).toHaveCount(1);await expect(dialog.locator('video')).toHaveAttribute('controls','');await expect(page.locator('video')).toHaveCount(1);await expect.poll(()=>dialog.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);await page.getByRole('button',{name:'拡大動画を閉じる'}).click();await expect(dialog).not.toBeVisible();await expect(page.locator('video')).toHaveCount(0);await expect(expand).toBeFocused();
});
test('long press opens modal while a drag remains ordinary scrolling input',async({page})=>{
 await page.goto('/');const control=page.getByRole('button',{name:/長押しで拡大/});const box=await control.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(500);await page.mouse.up();await expect(page.getByRole('dialog',{name:/拡大動画/})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:/拡大動画/})).not.toBeVisible();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.mouse.move(box.x+60,box.y+60);await page.waitForTimeout(500);await page.mouse.up();await expect(page.getByRole('dialog',{name:/拡大動画/})).not.toBeVisible();
});
