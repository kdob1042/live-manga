# 公開・転送手順

漫画制作はmanga-mac、閲覧はlive-mangaが担当する。アプリ本体のデプロイ、完成版の刊行、制作途中の転送は別の操作。実際のアカウント・認証情報・URLを推測しない。

## アプリ本体

Cloudflare WorkersのGit連携を本番デプロイの唯一の経路とする。

| 設定 | 値 |
| --- | --- |
| リポジトリ／本番ブランチ | `live-manga`／`main` |
| Build command | `npm ci && npm run build` |
| Production deploy command | `npx wrangler deploy` |
| Non-production builds | 有効 |
| Non-production deploy command | `npx wrangler versions upload --config wrangler.dev.jsonc` |

非本番設定はDashboardの`Settings > Build > Branch control`で行う。作業ブランチにも一時Previewができるが、継続確認はdevの最新ビルドを使う。mainの本番URLやAccessをPreview用に変更しない。通常ビルドはNodeだけで動く。反映後はmain CI、対象commit、URL、実配信Rangeを確認する。

## 環境と認証の所有者

| 環境 | 設定 | Worker | 非公開R2 | Catalog |
| --- | --- | --- | --- | --- |
| production | `wrangler.jsonc` | `live-manga` | `live-manga-media-prod` | `publication/catalog.json` |
| dev | `wrangler.dev.jsonc` | `live-manga-dev` | `live-manga-media-dev` | `publication/catalog.dev.json` |

- devのuploadには必ず`--config wrangler.dev.jsonc`を付ける。devに本番のR2書込み権限・秘密・送信先を渡さない。
- 両環境の`run_worker_first`に`/works/*`と`/catalog.json`を残し、静的配信による公開判定の迂回を防ぐ。
- devの`DEV_AUTH_REQUIRED=true`を維持する。productionの`REQUIRE_PUBLICATION_CATALOG`は、検証済みcatalog、R2 prefix、直URLを確認してから`true`へ切り替える。以後はcatalog欠落時もlegacyへ戻らない。
- `workers_dev: true`を維持し、`route`/`routes`を追加しない。falseで再デプロイすると既存のworkers.dev URLが消える。
- Access Application/PolicyはDashboardが所有する。各Workerのworkers.dev URLとPreview URLsにApplication・Allowポリシーを関連付ける。ポリシー作成だけでは保護されない。
- R2の公開Development URL・Custom Domainは無効。作品はWorkerの同一origin経由で配信する。

dev bucket作成、Workerの宛先、Access、ドメイン、本番切替の承認は人間がDashboardで設定する。account ID、token、実ドメイン、Access設定をリポジトリへ保存しない。公開経路の変更は通常の開発PRと分けた運用変更とする。`npm run verify:deploy-config`は設定ファイルの分離を検査するが、実アカウントの設定確認は別途必要。

## 完成版を刊行する

Node 22+とFFmpeg/ffprobeを導入した作者環境で、manga-macの書出しフォルダを指定する。

```sh
node scripts/publish.mjs /path/to/package RELEASE_ID
# 一覧と容量を確認した同じ版を送る
node scripts/publish.mjs /path/to/package RELEASE_ID --apply
```

送信時だけ`R2_ACCOUNT_ID`、`R2_BUCKET`、`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`を設定する。資格情報は専用bucketに限定し、ブラウザ・Git・作品へ保存しない。

処理順は実体検証 → dry-run → 不変upload（If-None-Match）→ 全ファイルの読戻し・hash照合 → catalog更新（ETag条件付き）。失敗・競合時は旧catalogを保持し、未公開prefixを自動削除しない。同じ版の再実行は既存内容が完全一致する場合だけ継続する。

```sh
node scripts/publish.mjs --rollback PREVIOUS_RELEASE_ID --apply
```

rollbackは`catalog.current`だけを旧版へ戻す。旧URLと読書中の版は維持する。legacy URLは`/?release=RELEASE_ID`、未指定は`catalog.current`。公開作品には非公開原稿・秘密を含めない。

## 制作途中を非公開で転送する

### 初回設定

`releases/`と`previews/<workId>/<episodeId>/`を分離する。R2直公開が無いことを実際に確認してから`PREVIEWS_PRIVATE='true'`を設定する。未設定は受信・配信とも503。既存刊行物を無断で移行・非公開化しない。

Worker secret `PREVIEW_KEYS`は次のJSON配列。制作アプリにはwrite専用、閲覧側には別のread専用キーを渡す。

| 項目 | 内容 |
| --- | --- |
| `sha256` | 43文字以上のランダムbase64urlキーのSHA256 |
| `workId`、`episodeId` | 対象作品・話 |
| `permissions` | readまたはwrite |
| `expiresAt` | ISO日時 |
| `revoked` | 失効指定（任意） |

OSの安全な乱数で生成し、生キーをGit・作品・ログへ残さない。readキーは`/preview-session`でHttpOnly/Secure/SameSite=Strict Cookieへ交換する。全GET/HEAD/Rangeで権限・期限・失効を確認する。削除または`revoked=true`で以後の取得を止められるが、取得済み画像は回収できない。

### 転送API

`P=/previews/w/e/transfers/t`。`t`はmanifestのreleaseIdと同じで、各要求にwrite Bearerを付ける。

| 操作 | 要求 |
| --- | --- |
| 開始 | `PUT P`に`{preview,baseRevision}` |
| ファイル転送 | `PUT P/assets/hash.ext`に実体、Content-Type、Content-Length |
| 確定 | `POST P/commit` |
| 再開状況 | `GET P`でreceived/missing/committed/current/viewerUrlを確認 |

assetはsha256・サイズ照合と不変put、最後にETag比較付きでcurrent.jsonを更新する。一括transactionではない。codec・実寸法のprobeは制作側native検証が担当する。

### 閲覧・更新

URLは`/?preview=w%2Fe&revision=t`。版未指定はcurrentを一度だけ取得し、「最新版を開く」で明示更新する。タグ切替には再転送・POST不要。private応答はno-storeとし、認可前の公開cacheを使わない。保存期限は未指定のため旧版を自動削除しない。

実R2・認証・配信の確認は、ローカルや人工サンプルの試験と分ける。

HTTP仕様: [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/) · [R2 S3条件付き操作](https://developers.cloudflare.com/r2/api/s3/api/)
