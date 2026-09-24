# 開発案内

live-mangaは漫画の読者アプリ。原稿はstory-library、制作はmanga-macが担当する。

| 変更対象 | 読む・編集する場所 |
| --- | --- |
| 起動、URL、作品取得、エラー表示 | `src/main.tsx`、`index.html` |
| ページ表示、コマ内再生 | `src/reader.tsx` |
| 拡大動画の操作 | `src/VideoDialog.tsx` |
| 作品一覧、目次、次話 | `src/WorkLibrary.tsx`、`PublicationNav.tsx`、`ReaderSidebar.tsx`、`EpisodeEnd.tsx` |
| 非公開プレビューの認証・更新 | `src/PreviewEntry.tsx` |
| 配信・公開判定 | `src/worker.mjs`、`publication-policy.mjs`、`preview-worker.mjs` |
| 配信契約 | `contracts/`（正本）、[形式](FORMAT.md) |
| 転送・公開 | `scripts/publish.mjs`、[公開手順](DEPLOY.md) |
| Issue/PRの状態・復旧 | [Project自動同期](PROJECT_AUTOMATION.md) |

## 性能と操作

- ルートごとに必要な画面だけを読み込む。取得中も案内を表示する。
- 動画の時刻更新はVideoDialog内で処理し、本文や目次を再描画しない。
- manifest・previewの索引は入力が変わった時だけ作る。画像は寸法を指定し、2ページ目以降をlazy読み込みする。動画は操作時だけ取得する。
- 閉じた読書メニューは`inert`にする。タップ・長押し・スクロール、文字レイヤーの設定を維持する。
- プレビュー更新の失敗は表示中の版を残して通知する。公開予定の話へ移動リンクを作らない。

## 設定の正本

| 設定 | ファイル |
| --- | --- |
| 依存・コマンド | `package.json`、`package-lock.json` |
| ビルド／型検査／ブラウザ試験 | `vite.config.js`／`tsconfig.json`／`playwright.config.js` |
| production／dev | `wrangler.jsonc`／`wrangler.dev.jsonc` |
| CI | `.github/workflows/ci.yml` |

production/devはWorker名、R2、catalog、認証を意図的に分けている。共通化でdevに本番の送信先を継承させない。実際の公開経路とAccessは[公開手順](DEPLOY.md)を確認する。

## 検証

Node 22+で`npm ci`後、`npm run lint`、`npm run typecheck`、`npm run build`、`npm test`、`npm run test:ui`、`npm run verify:deploy-config`を実行する。ブラウザ導入は`npx playwright install --with-deps chromium webkit`。

通常ビルドは保存済み人工サンプルを復元する。再生成と実体検証にはFFmpeg/ffprobe、Python/Pillow、DejaVu Sansが必要。制作側の受入試験は`tests/exporter-lock.json`で固定したmanga-macを用意し、`node scripts/exporter-acceptance.mjs /path/to/manga-mac`で実行する。

再生・拡大・シーク・音声、目次、作品間の移動、プレビュー、公開判定を確認する。初期JSと全chunkの合計は別に測る。Chromium/WebKit、実iPhone/Android、本番HTTPは別の結果として[検証記録](VALIDATION.md)へ残す。
