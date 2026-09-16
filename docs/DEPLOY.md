# Cloudflareへの公開

この変更にはCloudflare account・bucket・公開URLを含めていない。実際の設定値を推測しない。

## Web本体

既存方針に合わせ、Cloudflare WorkersのGit連携を唯一の本番デプロイ経路にする。接続repoはlive-manga、production branchはmain。Build commandは `npm ci && npm run build`、deploy commandは `npx wrangler deploy`。ビルド環境へFFmpeg/Python/Pillow/DejaVuを用意できない場合は、CIのdist artifactを利用する別経路へ明示的に切り替え、Git連携との二重deployを禁止する。

人工fixtureの生成環境依存を避ける本番ビルドは `npm ci && npx vite build`。この場合サンプルを出さず、`/?release=...` で公開作品へ直接誘導する。設定後、main CI成功・対応commit・公開URL・実配信rangeを確認する。dev/PRは人工素材のCIのみ。

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

旧刊行版へのcatalog.current参照を戻す。旧URLは維持し、読書中の版は切り替えない。作品は公開すると読者が取得可能。秘密情報・非公開原稿を公開しない。

HTTP実装の根拠: [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)、[R2 S3条件付き操作](https://developers.cloudflare.com/r2/api/s3/api/)。本番接続試験は別途必要。
