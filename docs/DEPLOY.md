# Cloudflareへの公開

この変更にはCloudflare account・bucket・公開URLを含めていない。実際の設定値を推測しない。

## Web本体

既存方針に合わせ、Cloudflare WorkersのGit連携を唯一の本番デプロイ経路にする。接続repoはlive-manga、production branchはmain。Build commandは `npm ci && npm run build`、deploy commandは `npx wrangler deploy`。ビルドは検証済みの小さな人工fixtureを復元するためNodeだけで実行できる。FFmpeg/Pillowはfixture再生成と実体検証時のみ必要。設定後、main CI成功・対応commit・公開URL・実配信rangeを確認する。dev/PRは人工素材のCIのみ。

R2 bucketは所有者が指定した実名を `wrangler.jsonc` の `r2_buckets` に追加し、bindingを `MEDIA` とする。bucketの公開書込は無効。WorkerはGET/HEADのみ。同一origin `/releases/<releaseId>/...` で配信するのでCORS設定は不要。公開一覧にない刊行版やmanifestにないassetは404。MP4欠損でHTMLへフォールバックしない。

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
