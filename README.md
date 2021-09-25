# [GAS] twitter-notification-on-line

特定のユーザに関するTwitterデータの通知・保存を行うアプリケーション

### 機能
- プロフィール・ヘッダー画像の更新とその内容をLINEに通知し、画像データをGoogleDriveに保存
- bioの更新とその内容をLINEに通知し、Googleスプレッドシートに記録
- 新規ツイートの内容をLINEに通知し、Googleスプレッドシートに記録。画像や動画が添付されている場合はGoogleDriveに保存
- 新規いいねの内容をLINEに通知
- 新規フォローの内容をLINEに通知
- 特定の検索結果の内容をLINEに通知し、Googleスプレッドシートに記録
- 特定のユーザのフォロー、フォロワー、いいね数の遷移を、毎日0時にスプレッドシートに保存しグラフ化

<img src="https://i.imgur.com/ivLcADT.jpg" height="150">

<img src="https://i.imgur.com/WHFffPb.png" height="150">

### 依存関係
- GASライブラリ
  - OAuth1
- API
  - Twitter API
  - LINE Notify API

### GASの設定
- OAuth1ライブラリを追加
- プロジェクトのプロパティに以下を追加
  - PROJECT_KEY: GASスクリプトID<br>
    (GAS編集画面のURLに記載`https://script.google.com/d/[GASスクリプトID]/edit`)
  - API_KEY: Twitter API Key
  - API_SECRET: Twitter API Secret
  - LINE_CHANNEL_ACCESS_TOKEN: LINE Notifyアクセストークン
- TwitterNotification#updateTimeline: *SCREEN_NAMEで指定したユーザーの最初のツイートのID*を指定

### [TwitterAPI](https://developer.twitter.com/en/portal/projects-and-apps)の設定

- Authentication settings > Callback URLsを指定
  - `https://script.google.com/macros/d/[GASスクリプトID]/usercallback callbaclurl`
- App permissions > **Read and Write**に設定

