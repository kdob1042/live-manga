# Development

Read [README](README.md), then the relevant row in [DEVELOPMENT](docs/DEVELOPMENT.md). Read only the applicable contract/deployment sections and current Issue/PR before changing code.

- Start from latest dev and reuse the Draft PR created by an exact `/start` Issue comment. Target dev; never directly push to dev/main or weaken protection.
- `contracts/` is the sole distribution contract. manga-mac consumes a pinned copy; do not edit a vendor copy or introduce manuscript/generation/database/credential data into the reader.
- [DEVELOPMENT](docs/DEVELOPMENT.md) owns the code/configuration map and validation commands. [PROJECT_AUTOMATION](docs/PROJECT_AUTOMATION.md) owns Issue/PR state, completion references and failure recovery. Do not manually maintain `status:*` or `agent:start`, or close Issues through Project Done.
- Keep an independent `Refs #number` line in PRs. Use `Closes #number` only for all acceptance criteria; partial work requires a follow-up Issue with `Parent: #number` before merging. Unverified criteria stay open.
- Mark ready only after required checks pass. Separate automated Chromium/WebKit, real devices and production deployment. Never present artificial fixtures as AI-generated artwork.

Keep rules and settings in their declared source of truth; link instead of copying them into additional agent files.
