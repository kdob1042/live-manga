# 開発の入口

1. [README](README.md)で操作と役割を確認する。
2. [開発案内](docs/DEVELOPMENT.md)の担当箇所と、作業対象のIssue・PRを読む。契約・公開設定は変更する場合だけ読む。
3. 最新devを取り込み、Issueの`/start`で作成された既存Draft PRで作業する。PRはdev向け。dev/mainへ直接pushせず、保護設定を弱めない。

- 配信契約の正本は`contracts/`。manga-macは固定版を取り込む。原稿、生成処理、制作DB、認証情報を読者アプリへ持ち込まない。
- Issue/PRの開始・完了・復旧は[Project自動同期](docs/PROJECT_AUTOMATION.md)に従う。`status:*`や`agent:start`を手動管理しない。
- PR本文に独立した`Refs #番号`行を置く。全受入条件を満たした場合だけ`Closes #番号`にする。部分完了は`Parent: #番号`付きの残件Issueを先に作る。
- 必須検証が通ってからreadyにする。自動ブラウザ試験、実機、本番配信の結果は分ける。人工サンプルをAI生成作品や実作品の検証実績と呼ばない。

説明と設定は担当ファイルに一度だけ書き、他の指示書からはリンクする。
