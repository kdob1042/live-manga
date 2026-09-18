# Cloudflareへの公開

この変更にはCloudflare account・bucket・公開URLを含めていない。実際の設定値を推測しない。

## Web本体

既存方針に合わせ、Cloudflare WorkersのGit連携を唯一の本番デプロイ経路にする。接続repoはlive-manga、production branchはmain。Build commandは `npm ci && npm run build`、production deploy commandは `npx wrangler deploy`。ビルドは検証済みの小さな人工fixtureを復元するためNodeだけで実行できる。FFmpeg/Pillowはfixture再生成と実体検証時のみ必要。設定後、main CI成功・対応commit・公開URL・実配信rangeを確認する。

### devブランチのPreview

`dev`を確認用Previewの基準ブランチにする。本番の`main`やAccessで保護された本番URLをPreview設定から変更しない。

Cloudflare Dashboardの対象Workerで、`Settings > Build > Branch control`を次のように設定する。

- Git branch（production branch）: `main`
- Builds for non-production branches: 有効
- Non-production branch deploy command: `npx wrangler versions upload`

これにより、`dev`へpushするたびにCloudflareがPreview versionを作成する。Cloudflareのこの設定は全非本番ブランチが対象なので、作業ブランチにも一時Previewが生成されるが、継続的に確認する基準URLは`dev`の最新ビルドとする。`main`へのpushだけが本番`npx wrangler deploy`を実行する。

このプロジェクトのPreviewも限定公開で運用するため、Access Applicationで本番の`workers.dev` URLだけでなくPreview URLsも保護対象に含める。Accessのポリシーを作成しただけでは対象Applicationに適用されないため、対象WorkerのPreview URLへの関連付けをDashboardで確認する。Previewに本番R2の書込権限や秘密を追加しない。実データを使う場合は、本番と同じMEDIA bindingを不用意にPreviewへ公開しない運用確認を先に行う。

## 公開経路とCloudflare Accessの所有者

このWorkerは、**Accessで保護した `workers.dev` URL** を公開経路として使う前提で運用する。Cloudflare公式仕様では、`workers_dev: false` を含めて再デプロイすると `workers.dev` ルートが無効になるため、このリポジトリでは `workers_dev: true` を固定する。

- `workers_dev: true` を維持する。これでURLが存在し、Cloudflare Access Applicationが認証を要求する。
- `workers_dev: false` に変更しない。次回デプロイで公開URLが消える。
- `wrangler.jsonc` に `routes` または `route` を追加しない。Workersの公開URLはworkers.dev、認証・許可はCloudflare Dashboard側のAccess Application/Policyの所有物とする。
- このリポジトリにはAccessのポリシー、API token、カスタムドメインを保存しない。
- Dashboardでは、対象Workerの `workers.dev` URLにAccess Applicationを関連付け、Allowポリシーを設定する。ポリシーを作成しただけではアプリケーション保護は成立しない。
- CIの `npm run verify:deploy-config` が、`workers_dev`、ルート宣言、非公開MEDIA bindingの変更を検査する。アクセス経路を変更するときは、このリポジトリの通常開発PRとは別の運用変更として扱う。

R2の公開Development URLとCustom Domainは無効のままにする。作品ファイルはWorkerの同一origin経由で配信し、R2を直接公開しない。

## 完成作品の刊行

Node 22+、FFmpeg/ffprobeを導入した作者環境で、manga-macが書き出したフォルダを指定する。

```sh
node scripts/publish.mjs /path/to/package RELEASE_ID
# 上でファイル一覧・容量を確認した同じ刊行版だけを転送する
node scripts/publish.mjs /path/to/package RELEASE_ID --apply
```

送信時だけ環境変数 `R2_ACCOUNT_ID`, `R2_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` を設定。専用bucketに限定したR2 S3 credentialsを使い、ブラウザ・Git・作品には保存しない。

CLIは全実体検証→ファイルと容量のdry-run→If-None-Matchによる不変upload→全実体をstreamで読み戻してhash照合→最後にETag条件付きcatalog更新。通信失敗や同時刊行の競合は成功扱いせず、旧カタログを保持する。失敗した未公開prefixは自動削除しない。同じ版の再実行は既存内容が完全一致する場合だけ継続する。

```sh
node scripts/publish.mjs --rollback PREVIOUS_RELEASE_ID --apply
```

旧刊行版へのcatalog.current参照を戻す。旧URLは維持し、読書中の版は切り替えない。未指定URLはcatalog.currentを開く。各読者は読み始めたreleaseIdへ固定し、閲覧中に版を切り替えない。作品は公開すると読者が取得可能。秘密情報・非公開原稿を公開しない。

HTTP実装の根拠: [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)、[R2 S3条件付き操作](https://developers.cloudflare.com/r2/api/s3/api/)。本番接続試験は別途必要。

## 非公開の制作途中転送（Issue #22）

保存は非公開のMEDIA R2 binding。releases/とpreviews/<workId>/<episodeId>/を分離し、R2直公開（r2.dev/カスタムドメイン）が無いことを確認してからPREVIEWS_PRIVATE='true'を設定する。この変数だけでバケットの公開状態を検査した扱いにはしない。既存刊行物を無断で非公開化・移行しない。未設定なら受信・配信とも503。

Worker secret PREVIEW_KEYSはJSON配列。各項目はsha256（ランダムな43文字以上のbase64urlキーのSHA256）、workId、episodeId、permissions（readまたはwrite）、expiresAt（ISO日時）、revoked（任意）。鍵生成はOSの安全な乱数を使い、生キーはGit/作品/ログへ置かない。制作アプリにはwriteだけのキー、ビューワーには別のreadだけのキーを設定する。readキーは最初の閲覧時に入力し、/preview-sessionがHttpOnly/Secure/SameSite=Strict Cookieへ交換する。全GET/HEAD/Rangeで権限・期限・失効を再検査する。PREVIEW_KEYSからの削除またはrevoked=trueで以後の取得を停止する。取得済み画像の回収は保証しない。

転送API: PUT /previews/w/e/transfers/t に {preview,baseRevision}、同path/assets/hash.extへContent-TypeとContent-Length付きのバイナリPUT、同path/commitへPOST。tは内manifest.releaseIdと同一。各要求にwrite Bearerを付ける。GET同pathでreceived/missing/committed/current/viewerUrlを照会して再開する。assetはR2のsha256/サイズ検証と不変条件付きput、最後にETag比較付きcurrent.json更新。複数オブジェクトを一括transactionとみなさない。codec・実寸法のprobeは既存の制作側native検証が担当し、Workerだけでffprobeを実行したとは扱わない。

閲覧は /?preview=w%2Fe&revision=t。版未指定はcurrentを一度取得し、読書中に自動更新しない。「最新版を開く」で明示更新。タグ切替・解除はPOST/再転送なし。全privateレスポンスはno-store、認可前の公開cacheを使わない。旧版の保存期限は未指定のため自動削除を追加していない。実R2/アカウント設定はローカル・fixture試験とは別に確認する。
