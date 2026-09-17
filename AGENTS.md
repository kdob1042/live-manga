# Development

Read README.md, docs/FORMAT.md, docs/DEPLOY.md, and the current issues first.
Start from latest dev, create a feature branch, open a PR to dev. Never push directly to dev/main or weaken protection. Promote dev to main only after required CI succeeds. Production deployment is a separate configured Cloudflare Git build after main.

contracts/ is the sole distribution contract. manga-mac vendors a commit + SHA256 pinned copy via its sync script. Do not add generation, Blender, project databases, credentials, or unpublished source to the reader.

Run npm ci, npm run lint, npm run typecheck, npm test, npm run build, npm run test:ui. Fixture generation needs FFmpeg/ffprobe, Python/Pillow and DejaVu Sans. Node 22+.
Report automated Chromium/WebKit results separately from real iPhone/Android and production deployment. Never label artificial fixtures as AI-generated artwork. Keep unverified conditions open in the issues.


## Issue/PR task state

- Issue open/closed and PRs are the source of truth; Project is a derived view. Do not add or manually maintain status:* labels.
- Before implementation, the agent adds agent:start or comments /start. Actions creates an empty-commit Draft PR from latest dev, or reuses the existing PR. Wait for it and implement on that branch; do not create a duplicate PR.
- New Issue → Todo; open PR (including Draft) → In Progress; current CI failure, change request, or unfinished Issue without an open replacement PR → Needs attention; closed Issue → Done. Ready for review stays In Progress.
- Put Refs #<number> on its own line. Only change to Closes #<number> when ALL acceptance criteria are met. For partial work, create a follow-up Issue first and put `Parent: #<number>` on its own line in that Issue. The synchronizer closes the parent after the Refs PR merges and the follow-up exists; without that Issue, the parent remains open and needs attention.
- Mark the PR ready only after required checks and acceptance criteria pass. Preserve the dev-first, PR-based workflow. Do not use Project Done to close Issues in reverse; see docs/PROJECT_AUTOMATION.md for recovery.
