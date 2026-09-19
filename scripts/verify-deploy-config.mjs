import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJsonc(file) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  return JSON.parse(source);
}

const configurations = [
  {
    label: 'production',
    file: 'wrangler.jsonc',
    name: 'live-manga',
    environment: 'production',
    catalogKey: 'publication/catalog.json',
    bucket: 'live-manga-media-prod',
  },
  {
    label: 'preview',
    file: 'wrangler.dev.jsonc',
    name: 'live-manga-dev',
    environment: 'dev',
    catalogKey: 'publication/catalog.dev.json',
    bucket: 'live-manga-media-dev',
  },
];

const errors = [];
for (const expected of configurations) {
  const config = readJsonc(expected.file);
  if (config.name !== expected.name) errors.push(expected.label + ': unexpected Worker name');
  if (config.workers_dev !== true) errors.push(expected.label + ': workers_dev must remain true for Access-protected workers.dev');
  if (config.main !== 'src/worker.mjs') errors.push(expected.label + ': main must point to src/worker.mjs');
  if (config.vars?.ENVIRONMENT !== expected.environment) errors.push(expected.label + ': ENVIRONMENT is not isolated');
  if (config.vars?.PUBLICATION_CATALOG_KEY !== expected.catalogKey) errors.push(expected.label + ': publication catalog key is not isolated');
  const media = config.r2_buckets?.find(binding => binding.binding === 'MEDIA');
  if (!media || media.bucket_name !== expected.bucket) errors.push(expected.label + ': MEDIA bucket is not isolated');
  const runWorkerFirst = config.assets?.run_worker_first ?? [];
  for (const route of ['/releases/*', '/works/*', '/catalog.json']) {
    if (!runWorkerFirst.includes(route)) errors.push(expected.label + ': assets.run_worker_first must include ' + route);
  }
  if ('routes' in config || 'route' in config) errors.push(expected.label + ': dashboard-managed routes must not be committed');
  if (expected.environment === 'dev' && config.vars?.REQUIRE_PUBLICATION_CATALOG !== 'true') {
    errors.push('preview: REQUIRE_PUBLICATION_CATALOG must remain true');
  }
}

if (errors.length) {
  console.error('Deployment safety guard failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('Deployment safety guard passed: production and preview configs are isolated.');
