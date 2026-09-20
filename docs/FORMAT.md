# Live Manga 1.0.0 / 2.0.0

このrepoの `live-manga.json` は漫画の公開パッケージ入口です。story-libraryの非公開原稿入口 `works/{workId}/work.json`、manga-macの制作snapshot、production/devの公開catalogとは別契約であり、同じファイルを兼用しません。原稿の本文パス・設定・人物設定はこの配信manifestへ持ち込まず、検証済みの公開assetだけを受け取ります。

正本は `contracts/schema.json`、意味検証は `contracts/validate.mjs`、ファイル検証は `contracts/package.mjs`、TypeScript型は `contracts/types.ts`。

`live-manga.json` と `assets/<SHA256>.<ext>` の自己完結フォルダ。配列順が読書順。versionは形式、releaseIdは不変の刊行版。内部原作commit・Job・秘密は公開manifestに載せない。

ページは基準width/heightと art（作画背景）、overlay（透明PNGの文字・枠）、fallback（完成静止画）を持つ。panelはframe、contain後のartRect、poster、公開text、任意motionを持つ。動画はartRectを置換し文字の下で再生。end=posterのみ。再生や次コマへの自動遷移なし。Viewerの既定表示では再生中のコマ動画をoverlayより前に表示し、そのコマ内の文字を隠す。読書メニューで無効化できる。停止・終了・失敗時は元の表示へ戻す。他のコマやページのoverlayは維持する。この設定は公開manifestを変更しない。ここまでは矩形v1の規則。自由コマ形状は後述のv2で扱う。

画像PNG/JPEG/WebP、動画MP4/H.264・無音・30秒以内。初期fixtureは5秒。初回の静止画と生成動画の先頭画素の一致は保証しない。開始画像のID/hash・identity変換・原文範囲は制作側で照合する。

上限は100ページ、32コマ/ページ、各辺8192px、4000asset、画像32MiB、動画128MiB、総量1GiB。スキーマは構造を検査し、validatorが重複ID、境界、比率、参照、hash名、未使用asset、外部URL/HTML/任意fieldを検査する。`verifyPackage`は余分なファイル・symlinkを拒否し、実hash/サイズとffprobeの実codec/寸法/尺を確認する。ブラウザは全動画を先読みしてhash計算しない。

契約の取り込みは固定commitの `contracts/validate.mjs` とschema/types/package検証器・fixture生成器をチェックサム付きで配布する。manga-macはversion、commit、validator SHA256をlockへ記録しsync scriptで検証して更新する。vendorの手編集は禁止。

人工fixtureは `node scripts/fixture.mjs` で生成。正常／異常例はtests/contract.test.mjs。これは有料AIや実作品の生成実績ではない。

## 2.0.0 — 自由コマと画像配置

v1の読込を維持し、新規出力は2.0.0へ移行する。ページ内の配列順が読書順で、ページごとにコマ数を変えられる。

v2 panelは従来のフィールドに`clip`を必須追加する。`clip`はページのピクセル座標による時計回りの凸四角形（4組の`[x,y]`）。`frame`はその正確な外接矩形。`artRect`は元poster全体を一様拡大・平行移動した描画先で、cropでは負座標やページ外を許す。回転・歪曲は扱わない。幅・高さはposterと同じ比率、ページの長辺の65536倍以下とする。

ページ上の通常のホームコマ内表示・コマ内動画クリップ・クリック可能領域はすべて`clip ∩ artRect`とする。v2ではartRectがframeを覆うcover（crop）か、四隅がclip内にあるcontainのいずれかを許可する。コマ内動画も同じartRectとclipを使用し、終了時は元の作画レイヤーに戻る。既定では再生中のコマ動画をoverlayより前に表示する。clipとartRectは変えず、他コマの文字・枠を保持する。読書メニューで無効化できる。素材に焼き込まれた文字は除去しない。拡大表示だけコマの切り抜きを外し、motion動画の全画素をcontainで見せる。`motion`に別の配置を持たせない。制作側が静止ページに焼き込むoverflowはホームコマ内表示の例外であり、Liveの動画・クリック可能領域のclipは広げない。任意fieldや外部URLは引き続き拒否する。

拡大動画の操作UIは配信契約ではなくreaderの表示仕様である。ブラウザ標準の`video controls`は使用せず、黒いシアター表示を動画中心に保つ。再生中は操作UIを自動的に隠し、必要時だけ再生／一時停止、シーク、ミュート／音声オン、時間表示を表示する。10秒送り、PiP、ブラウザ依存の追加メニューは表示しない。

v1にはclipを追加せず、frame内のartRectという従来の規則をそのまま適用する。既存刊行フォルダとカタログの不変性は維持する。

## 制作途中プレビュー（Issue #22）

公開刊行物と分離した live-manga-preview 1.0.0 envelopeを contracts/preview.mjs / preview.schema.json / preview-types.tsで定義する。内側のmanifestは既存v1/v2のページ・画像・動画契約をそのまま利用する。savedAt、転送漫画に必要なscenes（id/tags）、panels（id/sceneIds/art/lettering/motion）のみ追加。原稿全文・制作DB・秘密は含めない。scene-local AND/ORで一致したscene→panel→pageを導出し、ページの元番号・配置を保つ。フィルタで資産や転送版を変更しない。タグなし作品は全体表示。画像のみのpanelはtext=''、画像は必須。

未完成のartは有効なplaceholder画像を制作側が用意する。文字なしnoneと未配置pendingを区別する。表示フィルタはアクセス制限ではない。公開publishへpreview envelopeを渡すと既存validatorが拒否する。
