# 漫画ビューアーのルート

live-mangaは漫画専用。原稿の正本はstory-library、小説は独立ビューアーで配信する。小説本文、Markdown変換、小説読書UIは本アプリに含めない。

| URL | 内容 |
| --- | --- |
| `/` | 公開漫画作品一覧 |
| `/works/{workId}/` | 漫画作品の目次 |
| `/works/{workId}/manga/{episodeId}` | 漫画1話のビューアー |

`/catalog.json`は漫画の公開メタデータだけを返す。漫画manifestとassetは話ごとの公開判定を通す。予約話には本文・releaseId・asset URLを返さない。manga-mac → 非公開R2 → live-mangaの転送・閲覧経路は維持する。

## 小説版への任意リンク

非公開のpublication/v1カタログの作品に `novelUrl`（作品トップのHTTPS URL）と `novelPublished: true` を設定すると、公開カタログに `novelUrl`だけを返し、作品一覧・読書パネルに「小説版を読む」を表示する。同じworkIdの独立小説ビューアーが公開済みであることを確認して設定する。未設定・false・不正URLではURL自体を返さない。公開停止時はnovelPublishedをfalseにしたカタログを配信する。漫画側にも公開対象の話がない作品は一覧に出さない。

URLや公開状態は推測しない。小説側から漫画へのリンクも作品トップを用い、話数の一致を要求しない。Accessと公開範囲は別途の既存設定を維持する。

旧カタログのformats.novelは移行互換のため無視する。小説の目次・本文・公開予定を露出しない。旧 `/works/{workId}/novel/...` は404とし、静的SPAへフォールバックしない。R2上の旧小説データはこの変更では削除しない。

旧 `/releases/{releaseId}/...` の漫画互換経路および非公開プレビュー転送APIは維持する。
