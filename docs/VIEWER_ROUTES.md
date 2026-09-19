# 共通ビューアーのルート

公開Workerは `/catalog.json` で作品・形式・話の公開メタデータだけを返す。本文や漫画manifestは一覧へ埋め込まず、公開判定済みの話を開いたときだけ取得する。

| URL | 内容 |
| --- | --- |
| `/` | 公開作品一覧 |
| `/works/{workId}/` | 作品の小説・漫画と各話の目次 |
| `/works/{workId}/novel/{episodeId}` | 小説1話のビューアー |
| `/works/{workId}/manga/{episodeId}` | 漫画1話のビューアー |

小説本文は `/works/{workId}/novel/{episodeId}/content.json` から1話ずつ取得する。漫画は同じ公開キーで `manifest.json` とassetを取得する。小説と漫画の話ID・公開範囲は独立しており、1対1対応を要求しない。

予約公開の話は一覧に鍵付きで表示できるが、本文・releaseId・asset URLは返さない。WorkerがreleaseAt到達後に同じURLを解禁する。

旧 `/releases/{releaseId}/...` URLは、公開カタログの本番切替が完了するまで互換経路として残す。新しい公開範囲は `/works/...` の公開ゲートだけで制御する。
