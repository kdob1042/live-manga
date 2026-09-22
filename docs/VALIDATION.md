# 検証記録

開始dev: 46f6177eefe5de5bd83869c688fcb0b9646a9753。Issue #1 / #2、およびmanga-mac #39に対応。

人工fixtureは4コマ、5秒無音H.264が1コマ。ffprobe/hash/寸法検証、異常path/HTML/version/参照/境界/重複ID、配信Range/HEAD/ETag/If-Range/416/404、刊行途中失敗とrollbackを自動試験する。

Node・build・TypeScriptの結果とUI実行結果はPRへ記録。WebKit自動試験と実iPhoneは別受入。

未実施: 実iPhone Safari、実Android Chrome、Mac GUI、有料生成品質、R2本番認証・配信、Cloudflare本番公開。これらをfixture成功から推定しない。#1/#2/#39は残条件がある限りcloseしない。


## Issue #10: v2自由レイアウト接続（2026-09-17）

- 正本contracts v2と従来v1の読込、公開許可リスト・形状・画像変換・参照を検証。lint/typecheck/build、単体10件成功。
- manga-macの実Canvas→Rustエクスポータで人工4/6コマ・斜め枠・cropを出力。PNGとfallbackを照合し、ネイティブ側で頂点・割当改変を拒否。公開先へmanifest/assetのbytesを変更せず渡す。
- Chromium 13件、WebKit 13件成功（各5件がv2 producer出力、8件が従来v1）。配置寸法、動画と静止画の画素比較、終了後の静止画一致、斜め枠外のヒット拒否、拡大時の同一変換、crop元画像ではなく可視枠の画面外判定を確認。
- ローカルのブラウザCDN/OS依存の制限を補うため、Chromiumは外部実行ファイル、WebKitは公式Playwrightビルドとローカル展開したUbuntuライブラリを使用。CIは標準の `playwright install --with-deps chromium webkit` を使用する。
- CIでは `tests/exporter-lock.json` に固定した制作側をcheckoutし、`scripts/exporter-acceptance.mjs`で同じ受入を必須実行する。fixtureは人工校正用でAI生成実績ではない。Mac実機・実スマホ・本番公開は未実施。

## Issue #61 / PR #62: 読書導線と起動負荷（2026-09-22）

- 最新dev（454c0ce）を取り込み、動画の文字非表示、タップ・長押し・スクロールの動作を維持した。
- lint、typecheck、build、Node 29件、公開設定の分離検査が成功。Chromium 138では読書・動画・プレビュー・作品移動の19件が成功。最後のメニュー整理と矢印色修正は該当2件を再実行して成功し、日本語のPC・スマホ幅スクリーンショットを目視した。
- 新規回帰: 読込中の表示、作品名の重複、作品トップ・次話・公開予定、閉メニューのTab移動、catalogの重複取得、プレビュー更新失敗・再認証。
- 同じ依存でdevと比較したentry JSは256,457 → 233,286 bytes（9.0%減）。全JSは256,457 → 259,937 bytes。画面別読込による初期量の削減であり、全体容量や実機の応答速度が同率で改善したという意味ではない。
- WebKit本体は取得したが、この環境ではGTK/GStreamer等が不足し、依存導入もsetgroups/setuid制約で失敗したため未実行。制作側実出力を必要とする5件は通常UI試験ではskip。両ブラウザと固定producerの受入はCIで確認する。実スマホ、本番公開・R2接続は未検証。
