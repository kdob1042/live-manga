# 検証記録

開始dev: 46f6177eefe5de5bd83869c688fcb0b9646a9753。Issue #1 / #2、およびmanga-mac #39に対応。

人工fixtureは4コマ、5秒無音H.264が1コマ。ffprobe/hash/寸法検証、異常path/HTML/version/参照/境界/重複ID、配信Range/HEAD/ETag/If-Range/416/404、刊行途中失敗とrollbackを自動試験する。

Node・build・TypeScriptの結果とUI実行結果はPRへ記録。WebKit自動試験と実iPhoneは別受入。

未実施: 実iPhone Safari、実Android Chrome、Mac GUI、有料生成品質、R2本番認証・配信、Cloudflare本番公開。これらをfixture成功から推定しない。#1/#2/#39は残条件がある限りcloseしない。
