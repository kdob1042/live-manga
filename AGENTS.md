# Development

Read README.md, docs/FORMAT.md, docs/DEPLOY.md, and the current issues first.
Start from latest dev, create a feature branch, open a PR to dev. Never push directly to dev/main or weaken protection. Promote dev to main only after required CI succeeds. Production deployment is a separate configured Cloudflare Git build after main.

contracts/ is the sole distribution contract. manga-mac vendors a commit + SHA256 pinned copy via its sync script. Do not add generation, Blender, project databases, credentials, or unpublished source to the reader.

Run npm ci, npm run lint, npm run typecheck, npm test, npm run build, npm run test:ui. Fixture generation needs FFmpeg/ffprobe, Python/Pillow and DejaVu Sans. Node 22+.
Report automated Chromium/WebKit results separately from real iPhone/Android and production deployment. Never label artificial fixtures as AI-generated artwork. Keep unverified conditions open in the issues.


## Issue/PR task state

- New implementation issues receive status:ready; an issue is considered started only when a Draft PR exists.
- To start a task, a maintainer adds the agent:start label or comments /start. GitHub Actions creates issue/<number>-<short-name> from the latest dev and opens a Draft PR.
- The linked issue moves to status:in-progress, then status:review when the PR is ready for review, and status:done after merge. A closed, unmerged PR becomes status:blocked.
- Keep Refs #<number> in the PR body and mark the PR ready only after the required checks and acceptance criteria pass.
- Creating a branch alone is not a start event; preserve the existing dev-first, PR-based workflow.
