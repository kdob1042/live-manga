# Development map

The reader consumes published packages. It does not own source manuscripts, generation jobs, Blender, or the production database.

| Responsibility | Entry point |
| --- | --- |
| Route, catalog, manifest loading and error screen | `src/main.tsx` |
| Mounted pages and single-video playback lifecycle | `src/reader.tsx` |
| Expanded video controls and playback ticks | `src/VideoDialog.tsx` |
| Work list, publication links, reader menu | `src/WorkLibrary.tsx`, `src/PublicationNav.tsx`, `src/ReaderSidebar.tsx` |
| Private preview authentication and refresh | `src/PreviewEntry.tsx` |
| HTTP/R2 serving and publication gates | `src/worker.mjs`, `src/publication-policy.mjs`, `src/preview-worker.mjs` |
| Package schema, types, validation | `contracts/` (sole distribution contract) |
| Package publishing and verification | `scripts/publish.mjs`, `contracts/package.mjs` |

Routing imports the reader, work library, and private preview entry only when needed. A playback time update stays inside VideoDialog; it must not rebuild the page tree. Indexes derived from the immutable manifest/preview are reused until their inputs change. The first page loads eagerly; later page images use native lazy loading with explicit dimensions. Video remains user-initiated.

## Configuration ownership

| Concern | Source of truth |
| --- | --- |
| Dependencies and commands | `package.json`, `package-lock.json` |
| Web build | `vite.config.js` |
| Type checking | `tsconfig.json` |
| Browser matrix and local server | `playwright.config.js` |
| Production deployment | `wrangler.jsonc` |
| Development deployment | `wrangler.dev.jsonc` |
| Validation jobs | `.github/workflows/ci.yml` |

The two Wrangler files deliberately specify separate worker names, buckets, catalog keys and authentication requirements. Do not deduplicate them by letting dev inherit production destinations. [DEPLOY.md](DEPLOY.md) owns deployment procedure, [FORMAT.md](FORMAT.md) explains the contract, and [VALIDATION.md](VALIDATION.md) records evidence. Do not copy these into new agent-specific rule files.

## Workflow and verification

Use latest dev → feature branch → PR to dev; never push directly to dev/main or weaken protection. Promote dev through a PR only after required checks succeed. Cloudflare production publication is a separate configured build after main.

Issue/PR state, `/start`, partial completion, and recovery are defined once in [PROJECT_AUTOMATION.md](PROJECT_AUTOMATION.md). Reuse its generated Draft PR.

Node 22+: `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:ui`, `npm run verify:deploy-config`. Fixture regeneration/package verification requires FFmpeg/ffprobe, Python/Pillow and DejaVu Sans; ordinary builds materialize the checked fixture.

Compare initial JS separately from all emitted chunks and media; route splitting does not imply an equal reduction in total download size. Run reader tests for playback, expansion, seek/mute, sidebar, private previews and publication routes. Report Chromium/WebKit results separately from real iPhone/Android and deployed HTTP behavior. Artificial fixtures are not AI artwork or production acceptance.
