# Development

Read README.md, docs/FORMAT.md, docs/DEPLOY.md, and the current issues first.
Start from latest dev, create a feature branch, open a PR to dev. Never push directly to dev/main or weaken protection. Promote dev to main only after required CI succeeds. Production deployment is a separate configured Cloudflare Git build after main.

contracts/ is the sole distribution contract. manga-mac vendors a commit + SHA256 pinned copy via its sync script. Do not add generation, Blender, project databases, credentials, or unpublished source to the reader.

Run npm ci, npm run lint, npm run typecheck, npm test, npm run build, npm run test:ui. Fixture generation needs FFmpeg/ffprobe, Python/Pillow and DejaVu Sans. Node 22+.
Report automated Chromium/WebKit results separately from real iPhone/Android and production deployment. Never label artificial fixtures as AI-generated artwork. Keep unverified conditions open in the issues.
