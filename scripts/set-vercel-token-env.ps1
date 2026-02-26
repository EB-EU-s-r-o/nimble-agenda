# Nastavi Vercel env premennu VERCEL_TOKEN z lokálneho scripts/vercel-deploy-token.txt
# Použitie: .\scripts\set-vercel-token-env.ps1
# Token sa používa pre automatizované deploye cez vercel CLI

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tokenFile = Join-Path $root "scripts\vercel-deploy-token.txt"
Set-Location $root

if (-not (Test-Path $tokenFile)) {
    Write-Host "Subor vercel-deploy-token.txt neexistuje. Vytvor ho a pridaj Vercel deployment token." -ForegroundColor Yellow
    exit 1
}

$token = Get-Content $tokenFile -Raw -Encoding utf8 | Where-Object { $_ -notmatch '^\s*#' } | Select-Object -First 1
if (-not $token -or $token.Trim() -eq "") {
    Write-Host "Token v subore vercel-deploy-token.txt je prazdny. Skontroluj obsah suboru." -ForegroundColor Yellow
    exit 1
}

$token = $token.Trim()
Write-Host "Nacitany token: $($token.Substring(0, [Math]::Min(20, $token.Length)))..." -ForegroundColor Cyan

$tempDir = [System.IO.Path]::GetTempPath()
$tmpFile = Join-Path $tempDir "vercel_token_$([Guid]::NewGuid().ToString('N').Substring(0,8)).txt"
try {
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($tmpFile, $token, $utf8NoBom)
    
    foreach ($env in "production", "preview") {
        Write-Host "Nastavujem VERCEL_TOKEN pre $env..." -ForegroundColor Yellow
        vercel env rm VERCEL_TOKEN $env --yes 2>$null | Out-Null
        Get-Content $tmpFile -Raw | vercel env add VERCEL_TOKEN $env 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Chyba pri nastaveni VERCEL_TOKEN pre $env. Najprv spust v tomto priečinku: vercel link" -ForegroundColor Red
            exit 1
        }
        Write-Host "OK: VERCEL_TOKEN nastaveny pre $env" -ForegroundColor Green
    }
} finally {
    if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }
}

Write-Host "`nVERCEL_TOKEN je nastaveny vo Vercel pre oba prostredia." -ForegroundColor Cyan
Write-Host "Teraz môžeš používať automatizované deploye cez skript: .\scripts\deploy-vercel.ps1" -ForegroundColor Cyan