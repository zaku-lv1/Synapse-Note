# Vercel デプロイメント チェックリスト

## デプロイメント前の設定 ✅

### ローカル開発環境
- [ ] `.env.example` を `.env` にコピー
- [ ] 必要な環境変数をすべて設定：
  - [ ] `SESSION_SECRET`（強力なランダム文字列）
  - [ ] `FIREBASE_PROJECT_ID`（あなたのFirebaseプロジェクトID）
  - [ ] `GEMINI_API_KEY`（Google AI APIキー）
  - [ ] `GOOGLE_APPLICATION_CREDENTIALS_JSON` または `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] `npm run validate-env` を実行して設定を確認
- [ ] `npm run dev` でローカルテスト

### Firebase設定
- [ ] Firebaseプロジェクトを作成
- [ ] Firestoreデータベースを有効化
- [ ] サービスアカウントキー（JSONファイル）を生成
- [ ] Firestoreセキュリティルールを設定
- [ ] Firebase接続をローカルでテスト

### Google AI設定
- [ ] Google AI/Gemini APIを有効化
- [ ] APIキーを生成
- [ ] アプリケーションでAPIキーをテスト

## Vercelデプロイメント ✅

### リポジトリ設定
- [ ] すべての変更をGitHubリポジトリにプッシュ
- [ ] `vercel.json` がルートディレクトリに存在することを確認
- [ ] `.gitignore` が機密ファイルを除外していることを確認

### Vercel設定
- [ ] リポジトリをVercelに接続
- [ ] Vercelダッシュボードで環境変数を設定：
  ```
  SESSION_SECRET=your-secure-session-secret
  NODE_ENV=production
  FIREBASE_PROJECT_ID=your-firebase-project-id
  GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
  GEMINI_API_KEY=your-gemini-api-key
  ```
- [ ] アプリケーションをデプロイ
- [ ] デプロイされたアプリケーションの機能をテスト

### デプロイメント後の検証
- [ ] アプリケーションが正しく読み込まれることを確認
- [ ] ユーザー登録・ログインをテスト
- [ ] クイズ作成（AI機能）をテスト
- [ ] データベース操作（保存・読み込み）をテスト
- [ ] Vercelファンクションログでエラーを確認

## 環境変数リファレンス

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `SESSION_SECRET` | ✅ | セッション暗号化キー | `your-super-secret-key-here` |
| `FIREBASE_PROJECT_ID` | ✅ | FirebaseプロジェクトID | `synapse-note-12345` |
| `GEMINI_API_KEY` | ✅ | Google AI APIキー | `AIzaSy...` |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | ✅* | サービスアカウントJSON（文字列） | `{"type":"service_account",...}` |
| `NODE_ENV` | ⚠️ | 環境モード | `production`（Vercelで自動設定） |
| `PORT` | ⚠️ | サーバーポート | `3000`（Vercelで自動設定） |

*本番デプロイに必要。ローカル開発では `GOOGLE_APPLICATION_CREDENTIALS` をファイルパスで使用可能。

## トラブルシューティング

### よくある問題
1. **"Firebase Admin SDK initialization failed"**
   - `GOOGLE_APPLICATION_CREDENTIALS_JSON` の形式を確認
   - サービスアカウントの権限を確認
   - **新機能**: アプリケーションは機能を制限して動作を継続

2. **"Session secret required"**
   - Vercel環境変数で `SESSION_SECRET` が設定されていることを確認

3. **"AI features unavailable"**
   - `GEMINI_API_KEY` が正しく設定されていることを確認
   - APIクォータと課金設定を確認

4. **データベース接続の問題**
   - Firestoreの権限を確認
   - FirebaseプロジェクトIDを確認
   - **新機能**: `/health` エンドポイントでデータベース状態を確認

5. **"Not Found" エラー（修正済み）**
   - クイズのようなURLが適切にリダイレクトされるようになりました
   - データベース接続を `/health` エンドポイントで確認
   - 環境変数が正しく設定されていることを確認

### ヘルプの取得
- Vercelダッシュボードでファンクションログを確認
- 設定問題には `npm run validate-env` を使用
- 詳細なセットアップ手順は `DEPLOYMENT_JA.md` を参照
- **新機能**: リアルタイム状態情報は `/health` エンドポイントを確認
- **新機能**: 特定のVercelデプロイ修正については `VERCEL_FIX_DOCUMENTATION.md` を参照

## デプロイメント後のベストプラクティス

### セキュリティ
- [ ] HTTPS接続が正しく設定されていることを確認
- [ ] セッションセキュリティ設定を確認
- [ ] APIキーの権限を最小限に制限
- [ ] 定期的なセキュリティアップデート

### パフォーマンス
- [ ] ページ読み込み速度を確認
- [ ] 画像最適化を実装
- [ ] キャッシュ戦略を確認
- [ ] データベースクエリを最適化

### モニタリング
- [ ] Vercelアナリティクスを設定
- [ ] エラー監視を設定
- [ ] パフォーマンス監視を設定
- [ ] ユーザーフィードバック収集を設定

### メンテナンス
- [ ] 定期的なバックアップ戦略を実装
- [ ] 依存関係の更新スケジュールを設定
- [ ] ドキュメントの更新プロセスを確立
- [ ] 緊急時対応手順を文書化

## サポートリソース

### 公式ドキュメント
- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Firebase公式ドキュメント](https://firebase.google.com/docs)
- [Google AI公式ドキュメント](https://ai.google.dev/)

### プロジェクト固有のドキュメント
- [日本語版デプロイメントガイド](./DEPLOYMENT_JA.md)
- [英語版デプロイメントガイド](./DEPLOYMENT.md)
- [クイズルーティング修正](./QUIZ_ROUTING_FIX.md)
- [Vercel修正ドキュメント](./VERCEL_FIX_DOCUMENTATION.md)

### 緊急時の連絡先
- GitHub Issues: プロジェクトの問題報告
- Vercel Support: プラットフォーム関連の問題
- Firebase Support: データベース関連の問題