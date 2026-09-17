# Live Manga 1.0.0 / 2.0.0

正本は `contracts/schema.json`、意味検証は `contracts/validate.mjs`、ファイル検証は `contracts/package.mjs`、TypeScript型は `contracts/types.ts`。

`live-manga.json` と `assets/<SHA256>.<ext>` の自己完結フォルダ。配列順が読書順。versionは形式、releaseIdは不変の刊行版。内部原作commit・Job・秘密は公開manifestに載せない。

ページは基準width/heightと art（作画背景）、overlay（透明PNGの文字・枠）、fallback（完成静止画）を持つ。panelはframe、contain後のartRect、poster、公開text、任意motionを持つ。動画はartRectを置換し文字の下で再生。end=posterのみ。再生や次コマへの自動遷移なし。ここまでは矩形v1の規則。自由コマ形状は後述のv2で扱う。

画像PNG/JPEG/WebP、動画MP4/H.264・無音・30秒以内。初期fixtureは5秒。初回の静止画と生成動画の先頭画素の一致は保証しない。開始画像のID/hash・identity変換・原文範囲は制作側で照合する。

上限は100ページ、32コマ/ページ、各辺8192px、4000asset、画像32MiB、動画128MiB、総量1GiB。スキーマは構造を検査し、validatorが重複ID、境界、比率、参照、hash名、未使用asset、外部URL/HTML/任意fieldを検査する。`verifyPackage`は余分なファイル・symlinkを拒否し、実hash/サイズとffprobeの実codec/寸法/尺を確認する。ブラウザは全動画を先読みしてhash計算しない。

契約の取り込みは固定commitの `contracts/validate.mjs` とschema/types/package検証器・fixture生成器をチェックサム付きで配布する。manga-macはversion、commit、validator SHA256をlockへ記録しsync scriptで検証して更新する。vendorの手編集は禁止。

人工fixtureは `node scripts/fixture.mjs` で生成。正常／異常例はtests/contract.test.mjs。これは有料AIや実作品の生成実績ではない。

## 2.0.0 — 自由コマと画像配置

v1の読込を維持し、新規出力は2.0.0へ移行する。ページ内の配列順が読書順で、ページごとにコマ数を変えられる。

v2 panelは従来のフィールドに`clip`を必須追加する。`clip`はページのピクセル座標による時計回りの凸四角形（4組の`[x,y]`）。`frame`はその正確な外接矩形。`artRect`は元poster全体を一様拡大・平行移動した描画先で、cropでは負座標やページ外を許す。回転・歪曲は扱わない。幅・高さはposterと同じ比率、ページの長辺の65536倍以下とする。

表示・動画クリップ・クリック可能領域はすべて`clip ∩ artRect`とする。v2ではartRectがframeを覆うcropか、四隅がclip内にあるcontainのいずれかを許可する。動画も同じartRectとclipを使用し、終了時は元の作画レイヤーに戻る。文字・枠overlayを動画の上に維持する。拡大表示も同じ切り抜きを使う。`motion`に別の配置を持たせない。任意fieldや外部URLは引き続き拒否する。

v1にはclipを追加せず、frame内のartRectという従来の規則をそのまま適用する。既存刊行フォルダとカタログの不変性は維持する。
