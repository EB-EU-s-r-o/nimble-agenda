# Možnosť A: Po prevode repa z org na osobný účet – nastaví origin na nové repo a vypíše kroky pre Vercel.
# Použitie: .\scripts\vercel-hobby-after-transfer.ps1 -GitHubUser TVOJ_GITHUB_USERNAME
# Spusti až po tom, čo bol repozitár prevzatý (transfer) na tvoj osobný účet.

param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubUser,
    [string]$RepoName = "nimble-agenda"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$newUrl = "https://github.com/$GitHubUser/$RepoName.git"
git remote set-url origin $newUrl
Write-Host "Origin nastaveny na: $newUrl"
git remote -v

Write-Host ""
Write-Host "=== Ďalšie kroky (Vercel) ==="
Write-Host "1. Vercel Dashboard -> projekt nimble-agenda -> Settings -> Git"
Write-Host "2. Disconnect -> Connect Git Repository -> vyber $GitHubUser/$RepoName"
Write-Host "3. (Voliteľne) V tomto priečinku: vercel link (zvol existujúci projekt nimble-agenda)"
Write-Host "4. Ak si vytvoril nový Vercel projekt, nastav env (VITE_SUPABASE_*); inak ostávajú pôvodné."
Write-Host ""
Write-Host "Doc: docs\VERCEL-HOBBY-ORG-REPO.md"
