# shikounohako を GitHub Pages へ公開するワンショットスクリプト
# 使い方: Cursor ターミナルで .\scripts\publish-github.ps1

$ErrorActionPreference = "Stop"
$Repo = "shikounohako"
$Owner = "yosshi33"
$Root = Split-Path $PSScriptRoot -Parent

Set-Location $Root

Write-Host "=== 思考の箱 GitHub 公開スクリプト ===" -ForegroundColor Cyan

# git ユーザー設定（未設定時のみ）
if (-not (git config user.name)) {
  git config user.name $Owner
}
if (-not (git config user.email)) {
  git config user.email "$Owner@users.noreply.github.com"
}

# コミット
$status = git status --porcelain
if ($status) {
  git add .
  git commit -m "初回コミット: 思考の箱 shikounohako"
  Write-Host "コミット完了" -ForegroundColor Green
} else {
  $commits = git rev-list --count HEAD 2>$null
  if ($commits -eq "0" -or -not $commits) {
    git commit -m "初回コミット: 思考の箱 shikounohako"
    Write-Host "コミット完了" -ForegroundColor Green
  } else {
    Write-Host "コミット済み" -ForegroundColor Yellow
  }
}

# リモート設定
$remote = git remote get-url origin 2>$null
if (-not $remote) {
  git remote add origin "https://github.com/$Owner/$Repo.git"
  Write-Host "remote origin を追加しました" -ForegroundColor Green
}

# リポジトリ存在確認
Write-Host "GitHub リポジトリを確認中..." -ForegroundColor Cyan
$repoExists = $false
try {
  git ls-remote "https://github.com/$Owner/$Repo.git" HEAD 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { $repoExists = $true }
} catch {}

if (-not $repoExists) {
  Write-Host ""
  Write-Host "リポジトリがまだありません。ブラウザで作成します..." -ForegroundColor Yellow
  Start-Process "https://github.com/new?name=$Repo&visibility=public"
  Write-Host ""
  Write-Host "ブラウザで:" -ForegroundColor White
  Write-Host "  1. Repository name: $Repo （そのまま）"
  Write-Host "  2. README 等は追加しない"
  Write-Host "  3. Create repository をクリック"
  Write-Host ""
  Read-Host "作成したら Enter を押してください"
}

# push（初回はブラウザで GitHub ログインを求められます）
Write-Host "push 中..." -ForegroundColor Cyan
git branch -M main
git push -u origin main

if ($LASTEXITCODE -ne 0) {
  Write-Host "push に失敗しました。ブラウザのログインを確認して再実行してください。" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "push 完了!" -ForegroundColor Green
Write-Host ""
Write-Host "最後に GitHub Pages を有効化してください:" -ForegroundColor Cyan
Write-Host "  https://github.com/$Owner/$Repo/settings/pages"
Write-Host "  → Source: GitHub Actions を選択 → Save"
Write-Host ""
Write-Host "数分後に公開 URL:" -ForegroundColor Green
Write-Host "  https://$Owner.github.io/$Repo/"
Write-Host ""

Start-Process "https://github.com/$Owner/$Repo/settings/pages"
