import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'wrangler.jsonc');
const source = fs.readFileSync(configPath, 'utf8');
// wrangler.jsonc currently only needs line comments; keep the guard dependency-free.
const json = source
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/\/\*[\s\S]*?\*\//g, '');
const config = JSON.parse(json);

const errors = [];
if (config.workers_dev !== false) {
  errors.push('workers_dev must remain false; public access is controlled by Cloudflare Access');
}
if ('routes' in config) {
  errors.push('routes must not be declared here; Worker routing is dashboard-managed');
}
if ('route' in config) {
  errors.push('route must not be declared here; Worker routing is dashboard-managed');
}
const media = config.r2_buckets?.find(binding => binding.binding === 'MEDIA');
if (!media || media.bucket_name !== 'live-manga-media-prod') {
  errors.push('the private MEDIA binding must target live-manga-media-prod');
}
const runWorkerFirst = config.assets?.run_worker_first ?? [];
for (const route of ['/releases/*', '/catalog.json']) {
  if (!runWorkerFirst.includes(route)) {
    errors.push(`assets.run_worker_first must include ${route}`);
  }
}

if (errors.length) {
  console.error('Deployment safety guard failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Deployment safety guard passed: Cloudflare Access ownership and private MEDIA binding are preserved.');
