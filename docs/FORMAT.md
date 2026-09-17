# Live Manga 1.0.0

正本は `contracts/schema.json`、意味検証は `contracts/validate.mjs`、ファイル検証は `contracts/package.mjs`、TypeScript型は `contracts/types.ts`。

`live-manga.json` と `assets/<SHA256>.<ext>` の自己完結フォルダ。配列順が読書順。versionは形式、releaseIdは不変の刊行版。内部原作commit・Job・秘密は公開manifestに載せない。

ページは基準width/heightと art（作画背景）、overlay（透明PNGの文字・枠）、fallback（完成静止画）を持つ。panelはframe、contain後のartRect、poster、公開text（画像だけのコマは空文字）、任意motionを持つ。動画はartRectを置換し文字の下で再生。end=posterのみ。再生や次コマへの自動遷移なし。矩形v1であり自由コマ形状は未対応。

画像PNG/JPEG/WebP、動画MP4/H.264・無音・30秒以内。初期fixtureは5秒。初回の静止画と生成動画の先頭画素の一致は保証しない。開始画像のID/hash・identity変換・原文範囲は制作側で照合する。

上限は100ページ、32コマ/ページ、各辺8192px、4000asset、画像32MiB、動画128MiB、総量1GiB。スキーマは構造を検査し、validatorが重複ID、境界、比率、参照、hash名、未使用asset、外部URL/HTML/任意fieldを検査する。`verifyPackage`は余分なファイル・symlinkを拒否し、実hash/サイズとffprobeの実codec/寸法/尺を確認する。ブラウザは全動画を先読みしてhash計算しない。

契約の取り込みは固定commitの `contracts/validate.mjs` とschema/types/package検証器・fixture生成器をチェックサム付きで配布する。manga-macはversion、commit、validator SHA256をlockへ記録しsync scriptで検証して更新する。vendorの手編集は禁止。

人工fixtureは `node scripts/fixture.mjs` で生成。正常／異常例はtests/contract.test.mjs。これは有料AIや実作品の生成実績ではない。
