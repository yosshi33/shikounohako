# Publish shikounohako to GitHub Pages
# Usage: .\scripts\publish-github.ps1

$ErrorActionPreference = "Stop"
$Repo = "shikounohako"
$Owner = "yosshi33"
$Root = Split-Path $PSScriptRoot -Parent

Set-Location $Root

Write-Host "=== shikounohako GitHub publish ===" -ForegroundColor Cyan

if (-not (git config user.name)) {
  git config user.name $Owner
}
if (-not (git config user.email)) {
  git config user.email ($Owner + "@users.noreply.github.com")
}

$status = git status --porcelain
if ($status) {
  git add .
  git commit -m "initial commit: shikounohako"
  Write-Host "Committed." -ForegroundColor Green
} else {
  $count = git rev-list --count HEAD 2>$null
  if ($count -eq "0") {
    Write-Host "Nothing to commit." -ForegroundColor Yellow
  } else {
    Write-Host "Already committed." -ForegroundColor Yellow
  }
}

$remotes = git remote 2>$null
if (-not ($remotes -match "origin")) {
  git remote add origin ("https://github.com/" + $Owner + "/" + $Repo + ".git")
  Write-Host "Added remote origin." -ForegroundColor Green
}

Write-Host "Checking GitHub repo..." -ForegroundColor Cyan
$repoExists = $false
git ls-remote ("https://github.com/" + $Owner + "/" + $Repo + ".git") HEAD 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  $repoExists = $true
}

if (-not $repoExists) {
  Write-Host ""
  Write-Host "Repo not found. Opening browser to create it..." -ForegroundColor Yellow
  $newUrl = "https://github.com/new?name=" + $Repo + "&visibility=public"
  Start-Process $newUrl
  Write-Host ""
  Write-Host "In browser:"
  Write-Host "  1. Repository name: shikounohako"
  Write-Host "  2. Do NOT add README"
  Write-Host "  3. Click Create repository"
  Write-Host ""
  Read-Host "Press Enter after creating the repo"
}

Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git branch -M main
git push -u origin main

if ($LASTEXITCODE -ne 0) {
  Write-Host "Push failed. Sign in via browser and run this script again." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Push done!" -ForegroundColor Green
Write-Host ""
Write-Host "Enable GitHub Pages:" -ForegroundColor Cyan
$pagesUrl = "https://github.com/" + $Owner + "/" + $Repo + "/settings/pages"
Write-Host ("  " + $pagesUrl)
Write-Host "  Source: GitHub Actions -> Save"
Write-Host ""
$liveUrl = "https://" + $Owner + ".github.io/" + $Repo + "/"
Write-Host "Live URL (after a few minutes):" -ForegroundColor Green
Write-Host ("  " + $liveUrl)
Write-Host ""

Start-Process $pagesUrl
