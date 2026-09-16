import {test,expect} from '@playwright/test';
// Set by the paired exporter acceptance job; no handcrafted edits to the manifest.
test('manga-mac native output is accepted unchanged and plays in its original rectangle',async({page})=>{
 test.skip(!process.env.LIVE_MANGA_E2E_RELEASE,'requires actual manga-mac export');
 await page.goto('/?release='+process.env.LIVE_MANGA_E2E_RELEASE);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.locator('.page')).toHaveCount(1);await page.getByRole('button',{name:/再生/}).click();await expect.poll(()=>page.locator('video').evaluate(v=>v.currentTime)).toBeGreaterThan(0);await expect(page.locator('video')).toHaveCount(0,{timeout:10000});await expect(page.getByRole('status')).toContainText('▶');await page.screenshot({path:'test-results/exporter-package.png',fullPage:true});
});
