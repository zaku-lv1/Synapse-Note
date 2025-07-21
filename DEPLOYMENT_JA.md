# Synapse Note - Firebase クラウドデプロイメントガイド

このアプリケーションは Firebase/Vercel サーバーレス環境での動作専用に設計されています。

## 環境変数の設定

### 必要な環境変数

クラウドデプロイメントプラットフォームで以下の変数を設定してください：

#### 基本設定
- `SESSION_SECRET` - セッション暗号化用の秘密鍵（安全なランダム文字列を生成）
- `NODE_ENV` - クラウドデプロイメント用に `production` を設定

#### Firebase設定（必須）
**サービスアカウントJSON（クラウドデプロイメント必須）**
```bash
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
```

#### 追加設定
- `FIREBASE_PROJECT_ID` - あなたのFirebaseプロジェクトID
- `GEMINI_API_KEY` - Gemini統合用のGoogle AI APIキー

#### オプション設定
- `GOOGLE_APPS_SCRIPT_URL` - 外部API統合URL
- `USE_GOOGLE_APPS_SCRIPT` - Google Apps Script統合の有効/無効（デフォルト: true）

## Firebase セットアップ

1. https://console.firebase.google.com/ でFirebaseプロジェクトを作成
2. Firestore Database を有効化
3. サービスアカウントを作成：
   - プロジェクト設定 > サービスアカウント に移動
   - 新しい秘密鍵を生成
   - JSON全体を `GOOGLE_APPLICATION_CREDENTIALS_JSON` 用にコピー

## Vercelデプロイメント

### 前提条件
- Vercelアカウント
- サービスアカウントキー付きのFirebaseプロジェクト
- Google AI APIキー（Gemini機能用）

### デプロイメント手順

1. **リポジトリをVercelに接続**
   - Vercelダッシュボードでリポジトリをインポート
   - またはVercel CLIを使用: `vercel --prod`

2. **Vercelで環境変数を設定**
   
   Vercelプロジェクト設定で以下の環境変数を追加：
   
   ```
   SESSION_SECRET=your-secure-session-secret
   NODE_ENV=production
   FIREBASE_PROJECT_ID=your-firebase-project-id
   GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
   GEMINI_API_KEY=your-gemini-api-key
   ```

3. **Firebaseサービスアカウント設定**
   
   - Firebase Console > プロジェクト設定 > サービスアカウント
   - 新しい秘密鍵を生成（JSONファイル）
   - JSONの内容全体を一行でコピー
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`の値として貼り付け

4. **デプロイ**
   
   接続されたブランチにプッシュすると、Vercelが自動的にデプロイします。

### Vercel設定

プロジェクトには以下の設定で`vercel.json`が含まれています：
- `@vercel/node`ランタイムを使用
- すべてのリクエストを`server.js`にルーティング
- 最大ファンクション実行時間30秒
- 自動的に`NODE_ENV=production`を設定

## トラブルシューティング

### よくある問題

1. **Firebase認証エラー**
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON`が正しいJSON形式かご確認ください
   - Firebaseプロジェクトの権限をご確認ください
   - サービスアカウントキーの有効性をご確認ください

2. **セッションストレージの問題**
   - サービスアカウントのFirestore権限をご確認ください
   - セッションシークレットが正しく設定されているかご確認ください

3. **APIレート制限**
   - Gemini APIのクォータと制限をご確認ください
   - APIキーの権限をご確認ください

### 環境変数の検証

アプリケーションは起動時に必要な環境変数を検証します：
- `SESSION_SECRET` - セッション管理に必要
- Firebase認証情報 - データベースアクセスに必要
- `GEMINI_API_KEY` - AI機能に必要

## セキュリティ注意事項

- `.env`ファイルをバージョン管理にコミットしないでください
- 強力でユニークなセッションシークレットを使用してください
- APIキーを定期的にローテーションしてください
- Firebaseサービスアカウントの権限を最小限に制限してください

## ヘルスチェック

アプリケーションの状態を確認するために `/health` エンドポイントを使用できます：

```bash
curl https://your-app.vercel.app/health
```

このエンドポイントは以下の情報を提供します：
- アプリケーションの稼働状態
- データベース接続状態
- 設定された機能の状態

## パフォーマンス最適化

### Vercel特有の考慮事項
- ファンクションのコールドスタートを最小化するため、依存関係を最適化
- 大きなファイルアップロードに対する適切なタイムアウト設定
- セッションストレージのためのFirestore最適化

### 推奨設定
- セッション有効期限の適切な設定
- 画像アップロード用のファイルサイズ制限
- APIレート制限の実装

## モニタリング

### Vercelダッシュボード
- ファンクションログの監視
- パフォーマンスメトリクスの確認
- エラー率の追跡

### Firebase Console
- Firestoreの使用量監視
- セキュリティルールの確認
- データベースパフォーマンスの最適化

## バックアップと復旧

### データバックアップ
- Firestoreの自動バックアップ設定
- 重要な設定ファイルのバージョン管理
- 環境変数の安全な保存

### 災害復旧
- 複数環境での設定テスト
- ロールバック手順の文書化
- 緊急時の連絡体制