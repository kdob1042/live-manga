import {validate} from '../contracts/validate.mjs';
import {parseRange} from './http-range.mjs';
import {handlePreview} from './preview-worker.mjs';
import {
  findPublication,
  findPublicationByRelease,
  normalizePublicationCatalog,
  parsePublicationRoute,
  publicationDecision,
  publicCatalog,
} from './publication-policy.mjs';

export {parseRange};

const ID = /^[a-zA-Z0-9:_-]{1,128}$/;
const RELEASE_PATH = /^\/releases\/([a-zA-Z0-9:_-]{1,128})\/(live-manga\.json|assets\/[a-f0-9]{64}\.(?:png|jpg|webp|mp4))$/;

function json(value, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(value), {
    status,
    headers: {'Content-Type': 'application/json', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff'},
  });
}

function environment(env) {
  return env.ENVIRONMENT === 'dev' ? 'dev' : 'production';
}

function requireDevAccess(request, env) {
  if (environment(env) !== 'dev' || env.DEV_AUTH_REQUIRED === 'false') return null;
  const accessJwt = request.headers.get('Cf-Access-Jwt-Assertion');
  const accessEmail = request.headers.get('Cf-Access-Authenticated-User-Email');
  if (accessJwt || accessEmail) return null;
  return new Response('Authentication required', {status: 401, headers: {'Cache-Control': 'no-store', 'WWW-Authenticate': 'Bearer'}});
}

async function loadPublication(env) {
  if (!env.MEDIA) return {catalog: null, configured: false};
  const key = env.PUBLICATION_CATALOG_KEY || 'publication/catalog.json';
  const object = await env.MEDIA.get(key);
  if (!object) return {catalog: null, configured: false};
  if (object.size > 4 * 1024 * 1024) return {catalog: null, configured: true, error: 502};
  try {
    const value = await object.json();
    return {catalog: normalizePublicationCatalog(value, environment(env)), configured: true};
  } catch {
    return {catalog: null, configured: true, error: 502};
  }
}

function mustUsePublication(env, publication) {
  return publication.configured || env.REQUIRE_PUBLICATION_CATALOG === 'true';
}

async function serveApp(request, env) {
  const target = new URL('/', request.url);
  return env.ASSETS.fetch(new Request(target, request));
}

async function readMangaManifest(env, entry) {
  const key = `releases/${entry.releaseId}/live-manga.json`;
  const object = await env.MEDIA.get(key);
  if (!object || object.size > 4 * 1024 * 1024) return null;
  try {
    const manifest = validate(await object.json());
    if (manifest.releaseId !== entry.releaseId || manifest.workId !== entry.workId || manifest.episodeId !== entry.episodeId) return null;
    return {manifest, key};
  } catch {
    return null;
  }
}

async function serveMangaManifest(request, env, entry) {
  const loaded = await readMangaManifest(env, entry);
  if (!loaded) return new Response(null, {status: 502});
  return json(loaded.manifest, 200, 'no-cache');
}

async function serveNovelContent(request, env, entry) {
  const object = await env.MEDIA.get(`releases/${entry.releaseId}/novel.json`);
  if (!object || object.size > 4 * 1024 * 1024) return new Response(null, {status: 404});
  try {
    const content = await object.json();
    if (content.format !== 'novel' || content.workId !== entry.workId || content.episodeId !== entry.episodeId || typeof content.html !== 'string') {
      return new Response(null, {status: 502});
    }
    return json(content, 200, 'no-cache');
  } catch {
    return new Response(null, {status: 502});
  }
}

async function serveR2Asset(request, env, key, asset, cache = 'public, max-age=3600') {
  const head = await env.MEDIA.head(key);
  if (!head || asset && head.size !== asset.bytes) return new Response(null, {status: 404});
  const headers = new Headers({
    'Content-Type': asset?.mime || head.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Length': String(head.size),
    'ETag': head.httpEtag,
    'Accept-Ranges': 'bytes',
    'Cache-Control': cache,
    'X-Content-Type-Options': 'nosniff',
  });
  const match = request.headers.get('If-None-Match');
  if (match && (match === '*' || match.split(',').map(value => value.trim().replace(/^W\//, '')).includes(head.httpEtag))) {
    return new Response(null, {status: 304, headers});
  }
  let range = null;
  const value = request.headers.get('Range');
  const ifRange = request.headers.get('If-Range');
  if (request.method === 'GET' && value && (!ifRange || ifRange === head.httpEtag)) {
    range = parseRange(value, head.size);
    if (!range) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${head.size}`} });
    headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    headers.set('Content-Length', String(range.length));
  }
  if (request.method === 'HEAD') return new Response(null, {headers});
  const object = await env.MEDIA.get(key, {...(range ? {range} : {}), onlyIf: {etagMatches: head.etag}});
  if (!object || !object.body) return new Response(null, {status: 503});
  return new Response(object.body, {status: range ? 206 : 200, headers});
}

async function servePublicationEpisode(request, env, route, entry) {
  if (route.format === 'novel') {
    if (route.resource !== 'content.json') return new Response(null, {status: 404});
    return serveNovelContent(request, env, entry);
  }
  const loaded = await readMangaManifest(env, entry);
  if (!loaded) return new Response(null, {status: 502});
  if (route.resource === 'manifest.json') return json(loaded.manifest, 200, 'no-cache');
  if (!route.asset) return new Response(null, {status: 404});
  const assetPath = `assets/${route.asset}`;
  const asset = loaded.manifest.assets.find(item => item.path === assetPath);
  if (!asset) return new Response(null, {status: 404});
  return serveR2Asset(request, env, `releases/${entry.releaseId}/${asset.path}`, asset);
}

async function servePublication(request, env, publication, route) {
  if (route.kind === 'work') {
    const catalog = publicCatalog(publication.catalog);
    if (!catalog.works.some(work => work.workId === route.workId)) return new Response(null, {status: 404});
    return serveApp(request, env);
  }
  const entry = findPublication(publication.catalog, route.workId, route.format, route.episodeId);
  const decision = publicationDecision(entry, new Date(), publication.catalog.environment);
  if (decision.kind !== 'public') return new Response(null, {status: 404});
  if (route.resource === null) return serveApp(request, env);
  return servePublicationEpisode(request, env, route, entry);
}

async function legacyCatalog(request, env) {
  if (!env.MEDIA) return new Response(null, {status: 404});
  const object = await env.MEDIA.get('catalog.json');
  if (!object || object.size > 1024 * 1024) return new Response(null, {status: object ? 502 : 404});
  try {
    const catalog = await object.json();
    if (!Array.isArray(catalog.releases) || !catalog.releases.includes(catalog.current) || !ID.test(catalog.current)) return new Response(null, {status: 502});
    return json({current: catalog.current}, 200, 'no-cache');
  } catch {
    return new Response(null, {status: 502});
  }
}

async function legacyRelease(request, env, release, resource) {
  if (!env.MEDIA) return new Response(null, {status: 404});
  const catalogObject = await env.MEDIA.get('catalog.json');
  if (!catalogObject || catalogObject.size > 1024 * 1024) return new Response(null, {status: catalogObject ? 502 : 404});
  let catalog;
  try { catalog = await catalogObject.json(); } catch { return new Response(null, {status: 502}); }
  if (!Array.isArray(catalog.releases) || !catalog.releases.includes(release)) return new Response(null, {status: 404});
  const prefix = `releases/${release}/`;
  const manifestObject = await env.MEDIA.get(prefix + 'live-manga.json');
  if (!manifestObject || manifestObject.size > 4 * 1024 * 1024) return new Response(null, {status: 404});
  let manifest;
  try { manifest = validate(await manifestObject.json()); if (manifest.releaseId !== release) throw Error(); } catch { return new Response(null, {status: 502}); }
  if (resource === 'live-manga.json') return json(manifest, 200, 'public, max-age=3600');
  const asset = manifest.assets.find(item => item.path === resource);
  if (!asset) return new Response(null, {status: 404});
  return serveR2Asset(request, env, prefix + resource, asset, 'public, max-age=31536000, immutable');
}

export default {async fetch(request, env) {
  const preview = await handlePreview(request, env);
  if (preview) return preview;
  const devAuth = requireDevAccess(request, env);
  if (devAuth) return devAuth;
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status: 405, headers: {Allow: 'GET, HEAD'}});
  const url = new URL(request.url);
  const publication = await loadPublication(env);
  if (publication.error) return new Response(null, {status: publication.error});
  if (url.pathname === '/catalog.json') {
    if (publication.catalog) return json(publicCatalog(publication.catalog), 200, environment(env) === 'dev' ? 'no-store' : 'no-cache');
    if (env.REQUIRE_PUBLICATION_CATALOG === 'true') return new Response(null, {status: 503, headers: {'Cache-Control': 'no-store'}});
    return legacyCatalog(request, env);
  }
  const route = parsePublicationRoute(url.pathname);
  if (route && publication.catalog) return servePublication(request, env, publication, route);
  if (route) return new Response(null, {status: 404});
  if (!url.pathname.startsWith('/releases/')) return env.ASSETS.fetch(request);
  const match = RELEASE_PATH.exec(url.pathname);
  if (!match || !env.MEDIA) return new Response(null, {status: 404});
  if (publication.catalog) {
    const entries = [...publication.catalog.entries.values()].filter(entry => entry.format === 'manga' && entry.releaseId === match[1]);
    if (entries.length !== 1 || publicationDecision(entries[0], new Date(), publication.catalog.environment).kind !== 'public') return new Response(null, {status: 404});
  }
  return legacyRelease(request, env, match[1], match[2]);
}};
