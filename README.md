# Live Manga

普段は漫画。触れたコマだけ、その場で動画になる読者用Webアプリ。
制作は [manga-mac](https://github.com/kdob1042/manga-mac)、配信用契約の正本は本リポジトリの `contracts/`（2.0.0、従来の1.0.0も読込可能）。

```sh
npm ci
npm run build
npm run dev
```

通常ビルドはNode 22+のみ。`npm run build` は検証済みの人工4コマ・5秒無音MP4を復元する。`npm run fixture:generate`で再生成する場合だけ、FFmpeg/ffprobe、Python3/Pillow、DejaVu Sansが必要。実作品や有料生成は含まない。

- 動画を持つコマだけに欄外寄りの小さな再生可能マークを表示し、動画はコマを触れた時だけ取得。スマホは短押しでコマ内再生、長押しで大型表示。PCはクリックでコマ内再生、再生中の再クリックで大型表示。動画のないコマには操作表示を出さない。同時再生1コマ、終了／画面外／バックグラウンド時は静止画へ戻る。
- v2の自由四角形・可変コマ数・cropは静止画と動画で同じ配置を使用。
- 再生中も透過した文字・枠レイヤーを維持。動画失敗で読書を止めない。
- 静止モード、動きを減らす設定、キーボード、読書順のテキスト表示に対応。
- 作品URLは `/?release=刊行版ID`。刊行版は不変。未指定は公開カタログのcurrent、未刊行環境は人工サンプル。
- スマホ幅に追従し、ブラウザのズームを制限しない。

検証: `npm run lint`、`npm run typecheck`、`npm test`、`npm run build`、`npx playwright install --with-deps chromium webkit`、`npm run test:ui`。

[作品形式](docs/FORMAT.md) · [公開手順](docs/DEPLOY.md) · [検証記録](docs/VALIDATION.md)

制作側とのCI受入は `tests/exporter-lock.json` の固定commitを使用します。依存を導入したmanga-macのcheckoutを指定して `node scripts/exporter-acceptance.mjs /path/to/manga-mac` を実行すると、実書き出し→改変なしのコピー→Chromium/WebKitの読者試験を行います。
