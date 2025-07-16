# Synapse Note

> **言語選択 / Language:** 日本語 | [English](./README_EN.md) *(作成予定)*

Gemini AIを活用した英語・日本語クイズ生成・採点アプリケーション

## 概要

Synapse Noteは、Google Gemini AIを使用してクイズを自動生成し、解答を採点するWebアプリケーションです。教育現場や個人学習において、効率的な問題作成と学習進捗管理を実現します。

## 主な機能

### クイズ作成
- **テキストベース**: 自由なテキスト入力からクイズを生成
- **画像ベース**: 画像をアップロードしてクイズを自動生成
- **手動作成**: 自分でカスタムクイズを作成

### ユーザー管理
- ユーザー登録・ログイン機能
- 個人プロフィール管理
- パスワードのセキュアな管理（bcrypt暗号化）

### クイズ管理
- 作成したクイズの保存・編集
- クイズの公開・非公開設定
- クイズ履歴の管理

### 解答・採点システム
- リアルタイム解答機能
- AI による自動採点
- 詳細なフィードバック機能
- 解答履歴の保存

### 管理者機能
- ユーザー管理
- システム全体の統計情報
- データベース管理

## 技術スタック

### バックエンド
- **Node.js** - サーバーサイドJavaScript実行環境
- **Express.js** - Webアプリケーションフレームワーク
- **Firebase Admin SDK** - データベース・認証管理
- **Firestore** - NoSQLデータベース
- **Google Generative AI (Gemini)** - AI機能

### フロントエンド
- **EJS** - テンプレートエンジン
- **HTML/CSS/JavaScript** - 基本的なWeb技術

### セキュリティ・セッション管理
- **express-session** - セッション管理
- **@google-cloud/connect-firestore** - Firestoreセッションストア
- **cookie-parser** - Cookie解析
- **bcrypt** - パスワードハッシュ化

### その他
- **multer** - ファイルアップロード処理
- **dotenv** - 環境変数管理

## 必要な環境変数

以下の環境変数を設定する必要があります：

### 必須設定
```bash
SESSION_SECRET=your-secure-session-secret
FIREBASE_PROJECT_ID=your-firebase-project-id
GEMINI_API_KEY=your-gemini-api-key
```

### Firebase認証（以下のいずれか一つ）
```bash
# オプション1: サービスアカウントJSONファイル（本番環境推奨）
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# オプション2: サービスアカウントファイルパス（ローカル開発環境推奨）
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json
```

### オプション設定
```bash
PORT=3000                    # ポート番号（デフォルト: 3000）
NODE_ENV=development         # 実行環境（development/production）
```

## セットアップ手順

### 1. リポジトリのクローン
```bash
git clone https://github.com/zaku-lv1/Synapse-Note.git
cd Synapse-Note
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
```bash
# .env.exampleをコピーして.envファイルを作成
cp .env.example .env

# .envファイルを編集して必要な環境変数を設定
```

### 4. Firebase プロジェクトの設定
1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Firestoreデータベースを有効化
3. プロジェクト設定 > サービスアカウント でサービスアカウントキーを生成
4. 生成されたJSONファイルの内容を環境変数に設定

### 5. Google AI APIの設定
1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを生成
2. APIキーを環境変数 `GEMINI_API_KEY` に設定

### 6. 環境変数の検証
```bash
npm run validate-env
```

### 7. アプリケーションの起動
```bash
# 開発環境での起動
npm run dev

# 本番環境での起動
npm start
```

### 8. アプリケーションへのアクセス
ブラウザで `http://localhost:3000` にアクセス

## 使用方法

### 初回セットアップ
1. アプリケーションにアクセス
2. 「新規登録」からユーザーアカウントを作成
3. ログイン後、ダッシュボードでクイズ作成を開始

### クイズの作成
1. **テキストからクイズ作成**: 
   - 「Create Quiz」をクリック
   - テキストを入力してクイズを自動生成
   
2. **画像からクイズ作成**:
   - 「Create from Image」をクリック
   - 画像をアップロードしてクイズを自動生成
   
3. **手動でクイズ作成**:
   - 「Manual Create」をクリック
   - 自分で問題と選択肢を作成

### クイズの解答
1. 公開クイズ一覧または自分のクイズ一覧からクイズを選択
2. 問題に解答
3. 結果とフィードバックを確認

## デプロイメント

### Vercelへのデプロイ
詳細な手順については以下を参照してください：
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 英語版デプロイメントガイド
- [DEPLOYMENT_JA.md](./DEPLOYMENT_JA.md) - 日本語版デプロイメントガイド（作成予定）

### 主な手順
1. Vercelアカウントの作成
2. GitHubリポジトリをVercelに接続
3. 環境変数の設定
4. デプロイメントの実行

## トラブルシューティング

### よくある問題

1. **Firebase認証エラー**
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` の形式が正しいかご確認ください
   - Firebaseプロジェクトの権限設定をご確認ください

2. **セッションストレージエラー**
   - Firestoreの権限設定をご確認ください
   - セッションシークレットが正しく設定されているかご確認ください

3. **AI機能が利用できない**
   - `GEMINI_API_KEY` が正しく設定されているかご確認ください
   - APIの使用量制限をご確認ください

### デバッグ用エンドポイント
- `/health` - アプリケーションの状態確認

## 開発への貢献

プロジェクトへの貢献を歓迎いたします！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## ライセンス

このプロジェクトはISCライセンスの下で公開されています。

## 作者

**Zaku Lv1** - プロジェクト作成者

## 関連ドキュメント

### 日本語ドキュメント
- [デプロイメントガイド（日本語）](./DEPLOYMENT_JA.md)
- [Vercelデプロイチェックリスト（日本語）](./VERCEL_CHECKLIST_JA.md)

### 英語ドキュメント
- [英語版デプロイメントガイド](./DEPLOYMENT.md)
- [Vercelデプロイチェックリスト](./VERCEL_CHECKLIST.md)
- [クイズルーティング修正ドキュメント](./QUIZ_ROUTING_FIX.md)
- [Vercel修正ドキュメント](./VERCEL_FIX_DOCUMENTATION.md)

## サポート

問題やご質問がございましたら、GitHubのIssuesページでお知らせください。