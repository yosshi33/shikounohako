# セットアップ手順

## 前提

- Googleアカウント（個人用でOK）
- GitHubアカウント
- Node.js 20 以上

---

## 1. スプレッドシートを準備する

山田様が既に作成済みのシートをそのまま使います。

- シートURL: https://docs.google.com/spreadsheets/d/180-6mFnj9CeGtGVqt45VYjoPeClXvvOyCMdkeGTJvF8/edit
- スプレッドシートID: `180-6mFnj9CeGtGVqt45VYjoPeClXvvOyCMdkeGTJvF8`

新規シートを作る場合は、Googleドライブで新規スプレッドシートを作成し、URLの `/d/XXXXXX/edit` の `XXXXXX` 部分をメモします。

アプリ起動時に `thoughts` シートが自動作成され、ヘッダー行も書き込まれるため、シートは空っぽで構いません。

---

## 2. Google Cloud プロジェクトを準備する

### 2.1 プロジェクト作成（無ければ）

1. https://console.cloud.google.com/ を開く
2. 画面上部のプロジェクトセレクタ → 「新しいプロジェクト」
   - 例: `shikounohako`

### 2.2 API を有効化

プロジェクトを選んだ状態で、左メニュー「API とサービス」→「ライブラリ」から以下を有効化：

- **Google Sheets API**
- **Generative Language API** （Gemini の振り分け機能を使う場合）

### 2.3 OAuth 同意画面

1. 「API とサービス」→「OAuth 同意画面」
2. User Type: **External** （個人用なので External でOK）
3. アプリ情報入力:
   - アプリ名: `思考の箱`
   - ユーザーサポートメール: 自分のメール
   - デベロッパーの連絡先: 自分のメール
4. スコープは「ADD OR REMOVE SCOPES」から以下を追加:
   - `https://www.googleapis.com/auth/spreadsheets` （Sheets 読み書き）
   - `https://www.googleapis.com/auth/cloud-platform` （Gemini 用。必要なければ後で削る）
5. テストユーザーに自分の Gmail アドレスを追加

### 2.4 OAuth クライアント ID を作成

1. 「API とサービス」→「認証情報」→「認証情報を作成」→「OAuth クライアント ID」
2. アプリケーションの種類: **ウェブアプリケーション**
3. 名前: `shikounohako-web`
4. **承認済みの JavaScript 生成元**:
   - `http://localhost:5173` （ローカル開発用）
   - `https://{GitHubユーザー名}.github.io` （プロダクション）
5. 「作成」→ 表示される **クライアント ID** をメモ（`xxxx.apps.googleusercontent.com`）

---

## 3. GitHub リポジトリを準備する

### 3.1 リポジトリ作成

- 名前: `shikounohako`（小文字推奨）
- Public または Private どちらでも可（Pages はどちらも動く）

### 3.2 Secret を登録

リポジトリの「Settings」→「Secrets and variables」→「Actions」→「New repository secret」で以下を登録：

| Secret 名 | 値 |
|-----------|-----|
| `VITE_GOOGLE_CLIENT_ID` | 手順 2.4 のクライアント ID |
| `VITE_GOOGLE_SHEETS_ID` | 手順 1 のスプレッドシート ID |

### 3.3 Pages を有効化

「Settings」→「Pages」→ Source: **GitHub Actions**

---

## 4. デプロイする

main ブランチに push すると、`.github/workflows/deploy.yml` が自動実行されて GitHub Pages にデプロイされます。

デプロイ完了後:

- URL: `https://{GitHubユーザー名}.github.io/shikounohako/`

※ リポジトリ名が `shikounohako` 以外の場合は `vite.config.ts` の `GH_PAGES_BASE` もしくは環境変数を調整してください。

---

## 5. ローカル開発

```bash
git clone https://github.com/{ユーザー名}/shikounohako.git
cd shikounohako
npm install
cp .env.example .env
```

`.env` を編集:

```env
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
VITE_GOOGLE_SHEETS_ID=180-6mFnj9CeGtGVqt45VYjoPeClXvvOyCMdkeGTJvF8
```

開発サーバー起動:

```bash
npm run dev
```

`http://localhost:5173` を開くとサインイン画面が表示されます。

---

## 6. 初回サインイン時の注意

- 初回サインインで Google が「このアプリは確認されていません」と警告を出す場合があります
  - →「詳細」→「思考の箱（安全ではないページ）に移動」で進めます（個人用なので問題ありません）
- 権限として「スプレッドシートの表示と管理」を求められます
  - → 許可してください

---

## トラブルシューティング

### Q. サインインボタンを押しても何も起きない

- ブラウザのポップアップブロックを無効化してください
- GIS スクリプトがブロックされている可能性 → 広告ブロッカーを無効化

### Q. 「このアプリは確認されていません」が出る

- 個人利用のため公開ステータスにしていません。「詳細」→「安全ではないページに移動」で進んでください

### Q. シートの読み書きで 403 エラー

- 手順 2.2 で Sheets API が有効化されているか確認
- 手順 2.3 のテストユーザーに自分が追加されているか確認
- シートの共有設定で自分自身が編集者になっているか確認

### Q. AI振り分けが動かない

- 手順 2.2 で Generative Language API が有効化されているか確認
- OAuth スコープに `cloud-platform` が含まれているか確認
- 別途 API キーを使う場合は `.env` の `VITE_GEMINI_API_KEY` に設定

### Q. データが古いまま更新されない

- ブラウザをリロードしてください。Service Worker が古いキャッシュを返している可能性があります
- 開発者ツール → Application → Service Workers → Unregister

---

## セキュリティについて

このアプリは **APIキーを一切持ちません**。

- ユーザーが Google でサインインするたびに、ブラウザ内で一時的なアクセストークンが発行される
- トークンはメモリ上にのみ保持され、ページを閉じると消える
- Sheets / Gemini API はすべてこのトークンで認証される
- そのため、コードを GitHub に公開しても安全

ただし **スプレッドシートはあなた自身のアカウントのものが使われる** ので、他人にこのアプリを使わせる場合は、各自のシートを各自で用意してもらう構成になります。
