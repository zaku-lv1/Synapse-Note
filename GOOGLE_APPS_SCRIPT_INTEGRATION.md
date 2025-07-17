# Google Apps Script Integration

## 概要

Synapse Noteは、Google Apps Script APIエンドポイントと統合して、外部データソースからの統計情報や機能を提供できるようになりました。

## 設定

### 環境変数

以下の環境変数を `.env` ファイルまたは環境設定で設定してください：

```bash
# Google Apps Script API URL
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyQX2O29UD5hJqNOsmoyxXDdPaTX0ZGmfUuwdmUXpps6Gk9zSBEpO80spmN_lnMIegqpg/exec

# Google Apps Script統合の有効/無効（'false'に設定すると無効化）
USE_GOOGLE_APPS_SCRIPT=true
```

## 機能

### 1. 自動フォールバック機能

公開API エンドポイント（`/api/public/*`）は、まずGoogle Apps Scriptから情報を取得を試み、失敗した場合は自動的にローカルデータベースにフォールバックします。

- `/api/public/stats` - システム統計情報
- `/api/public/users/count` - ユーザー数
- `/api/public/quizzes/count` - クイズ数

### 2. Google Apps Script 専用API

新しいAPI エンドポイントがGoogle Apps Script との直接通信用に追加されました：

#### 接続テスト
```bash
GET /api/gas/ping
```

レスポンス例：
```json
{
  "success": true,
  "data": {
    "connected": true,
    "scriptUrl": "https://script.google.com/...",
    "testedAt": "2025-07-17T11:30:22.424Z"
  },
  "timestamp": "2025-07-17T11:30:22.425Z"
}
```

#### 任意のアクション送信
```bash
POST /api/gas/action
Content-Type: application/json

{
  "action": "customAction",
  "data": {
    "key": "value"
  }
}
```

#### ユーザーデータ送信（認証必要）
```bash
POST /api/gas/submit-user-data
Content-Type: application/json

{
  "data": {
    "customUserData": "value"
  }
}
```

#### クイズデータ送信（認証必要）
```bash
POST /api/gas/submit-quiz-data
Content-Type: application/json

{
  "data": {
    "customQuizData": "value"
  }
}
```

### 3. ヘルスチェック

`/health` エンドポイントにGoogle Apps Script の状態情報が追加されました：

```json
{
  "googleAppsScript": {
    "configured": true,
    "enabled": true,
    "url": "https://script.google.com/...",
    "connection": "connected"
  }
}
```

## Google Apps Script側の実装例

Google Apps Script側では、以下のようなパラメータを処理する必要があります：

```javascript
function doGet(e) {
  const action = e.parameter.action;
  
  switch(action) {
    case 'ping':
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
      
    case 'getStats':
      return ContentService.createTextOutput(JSON.stringify({
        totalUsers: 100,
        totalQuizzes: 50,
        totalAttempts: 200
      })).setMimeType(ContentService.MimeType.JSON);
      
    case 'getUserCount':
      return ContentService.createTextOutput(JSON.stringify({
        count: 100
      })).setMimeType(ContentService.MimeType.JSON);
      
    case 'getQuizCount':
      return ContentService.createTextOutput(JSON.stringify({
        count: 50
      })).setMimeType(ContentService.MimeType.JSON);
      
    default:
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Unknown action'
      })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  switch(action) {
    case 'submitUserData':
      // ユーザーデータを処理
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'User data received'
      })).setMimeType(ContentService.MimeType.JSON);
      
    case 'submitQuizData':
      // クイズデータを処理
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: 'Quiz data received'
      })).setMimeType(ContentService.MimeType.JSON);
      
    default:
      return ContentService.createTextOutput(JSON.stringify({
        error: 'Unknown action'
      })).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## トラブルシューティング

### 1. Google Apps Script接続エラー

Google Apps Script への接続が失敗する場合：

- Google Apps Script のURL が正しく設定されているかを確認
- Google Apps Script が正しくデプロイされているかを確認
- ネットワーク接続を確認

### 2. フォールバック動作

Google Apps Script への接続が失敗した場合、自動的にローカルデータベースにフォールバックします。これは正常な動作です。

### 3. 無効化

Google Apps Script統合を一時的に無効にしたい場合：

```bash
USE_GOOGLE_APPS_SCRIPT=false
```

## 使用例

### 統計情報の取得（フォールバック付き）

```bash
curl http://localhost:3000/api/public/stats
```

このエンドポイントは、まずGoogle Apps Scriptから統計情報を取得を試み、失敗した場合はローカルデータベースから取得します。

### Google Apps Script接続のテスト

```bash
curl http://localhost:3000/api/gas/ping
```

### カスタムデータの送信

```bash
curl -X POST http://localhost:3000/api/gas/action \
  -H "Content-Type: application/json" \
  -d '{"action": "customAction", "data": {"key": "value"}}'
```