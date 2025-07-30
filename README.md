# Synapse Note

Synapse Noteの後継開発レポジトリです。

## 概要
Synapse Noteは、ノート作成・クイズ管理・Google Apps Script連携など多機能なWebアプリケーションです。  
JavaScript／EJS／CSSで構築されています。

## 主な機能

- ノートの作成・編集・管理
- クイズ作成・実行・履歴表示
- 公開クイズ一覧の閲覧
- ユーザーのクイズ履歴表示
- 管理者向けクイズ・ユーザー管理
- システム統計情報の取得
- Google Apps Script連携によるデータ取得・保存
- APIドキュメント閲覧（インタラクティブなAPI試用）
- モバイルナビゲーション（ハンバーガーメニュー）
- PWA（Progressive Web App）対応（Service Workerによるオフライン機能）
- ヘルスチェック（/healthエンドポイント）
- 404エラー・管理者デモページ
- 自動フォールバック機能（Google Apps Scriptから取得失敗時はローカルDB利用）

## インストール方法

1. リポジトリをクローン
    ```bash
    git clone https://github.com/zaku-lv1/Synapse-Note.git
    cd Synapse-Note
    ```

2. 必要なパッケージをインストール
    ```bash
    npm install
    ```

3. サーバーを起動
    ```bash
    npm start
    ```
    または
    ```bash
    node app.js
    ```

4. ブラウザでアクセス  
    ```
    http://localhost:3000
    ```

## ディレクトリ構成例
```
├── public/
│   ├── js/
│   ├── css/
│   └── images/
├── views/
│   └── *.ejs
├── routes/
├── app.js
└── package.json
```

## ライセンス
本プロジェクトのライセンスについては`LICENSE`ファイルを参照してください。

## 開発・貢献
IssueやPull Requestは歓迎します。  
バグ報告やご要望等もお気軽にどうぞ。

---

> 追加したい情報や、アプリの特徴などがあれば教えてください。追記できます！
