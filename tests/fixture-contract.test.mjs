import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../contracts/validate.mjs';

const bundle=JSON.parse(await readFile(new URL('../contracts/fixture-assets.json',import.meta.url),'utf8'));
const manifest=validate(bundle.manifest);
const page=manifest.pages[0];

test('demo fixture demonstrates variable manga composition and one motion panel',()=>{
 assert.equal(page.panels.length,5);
 assert.equal(page.panels.filter(panel=>panel.motion).length,1);
 assert.ok(new Set(page.panels.map(panel=>panel.frame.width)).size>=4);
 assert.ok(new Set(page.panels.map(panel=>panel.frame.width)).size>=4);assert.ok(new Set(page.panels.map(panel=>panel.frame.height)).size>=3);
 const motion=page.panels.find(panel=>panel.motion);
 assert.ok(motion);
 assert.ok(motion.frame.height>motion.artRect.height);
 const overlayAsset=manifest.assets.find(asset=>asset.id===page.overlay);
 assert.ok(overlayAsset);
 assert.ok(bundle.files[overlayAsset.path].length>1000);
});
