# twitter-notification-on-line

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
