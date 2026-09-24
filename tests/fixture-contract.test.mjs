import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../contracts/validate.mjs';

const bundle=JSON.parse(await readFile(new URL('../contracts/fixture-assets.json',import.meta.url),'utf8'));
const manifest=validate(bundle.manifest);
const page=manifest.pages[0];
const frameBounds=page.panels.flatMap(panel=>[
 [panel.frame.x,panel.frame.y],
 [panel.frame.x+panel.frame.width,panel.frame.y+panel.frame.height]
]);

test('demo fixture demonstrates variable manga composition and one motion panel',()=>{
 assert.equal(page.width,748);
 assert.equal(page.height,1010);
 assert.equal(Math.min(...frameBounds.map(([x])=>x)),0);
 assert.equal(Math.max(...frameBounds.map(([x])=>x)),page.width);
 assert.equal(Math.min(...frameBounds.map(([,y])=>y)),0);
 assert.equal(Math.max(...frameBounds.map(([,y])=>y)),page.height);
 assert.equal(page.panels.length,5);
 assert.equal(page.panels.filter(panel=>panel.motion).length,1);
 assert.ok(new Set(page.panels.map(panel=>panel.frame.width)).size>=4);
 assert.ok(new Set(page.panels.map(panel=>panel.frame.width)).size>=4);assert.ok(new Set(page.panels.map(panel=>panel.frame.height)).size>=3);
 const motion=page.panels.find(panel=>panel.motion);
 assert.ok(motion);
 assert.deepEqual(motion.artRect,motion.frame);
 for(const assetId of [motion.poster,motion.motion.asset]) {
  const asset=manifest.assets.find(({id})=>id===assetId);
  assert.ok(asset);
  assert.equal(asset.width,motion.frame.width);
  assert.equal(asset.height,motion.frame.height);
  assert.ok(bundle.files[asset.path]);
 }
 const overlayAsset=manifest.assets.find(asset=>asset.id===page.overlay);
 assert.ok(overlayAsset);
 assert.ok(bundle.files[overlayAsset.path].length>1000);
});
