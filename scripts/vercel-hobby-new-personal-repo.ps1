# Možnosť B: Pridá remote na tvoje osobné repo a pushne aktuálnu vetvu.
# Použitie: .\scripts\vercel-hobby-new-personal-repo.ps1 -GitHubUser TVOJ_USER [-Branch main]
# Predtým vytvor na GitHub súkromné repo "nimble-agenda" (gh repo create nimble-agenda --private)
# alebo tento skript môže vytvoriť repo cez gh repo create ak je gh prihlásený.

param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubUser,
    [string]$Branch = "main",
    [string]$RepoName = "nimble-agenda"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$remoteName = "myorigin"
$repoUrl = "https://github.com/$GitHubUser/$RepoName.git"

$null = git remote get-url $remoteName 2>&1
if ($LASTEXITCODE -eq 0) {
    git remote remove $remoteName
}
git remote add $remoteName $repoUrl

Write-Host "Pushing branch '$Branch' to $repoUrl ..."
git push $remoteName "${Branch}:${Branch}"

Write-Host ""
Write-Host "=== Ďalšie kroky (Vercel) ==="
Write-Host "1. Vercel Dashboard -> Add New Project -> Import Git Repository -> vyber $GitHubUser/$RepoName"
Write-Host "2. Alebo v tomto priečinku: vercel link (a zvol nový projekt pre toto repo)"
Write-Host "3. Nastav env: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY"
Write-Host "   (anon key cez: .\scripts\set-vercel-supabase-key.ps1 -AnonKey \"...\")"
Write-Host "4. Redeploy: vercel --prod"
Write-Host ""
Write-Host "Doc: docs\VERCEL-HOBBY-ORG-REPO.md"
