# ==============================================================
# Firebase Auth – kompletny setup cez CLI (vsetko co sa da)
# ==============================================================
# Spustenie: .\scripts\firebase-setup-complete.ps1
# Volitelne: $env:FIREBASE_PROJECT_ID = "tvoj-project-id"
#            $env:SUPABASE_DB_URL = "postgresql://..."  (pre migracie)
# ==============================================================

param(
    [string]$SupabaseProjectRef = "eudwjgdijylsgcnncxeg"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

# Načítaj z .env premenné potrebné pre kroky 2–4 (ak ešte nie sú nastavené)
$envPath = Join-Path $ProjectRoot ".env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^\s*#') { return }
        if ($line -match '^\s*(\w+)\s*=\s*(.*)$') {
            $key = $matches[1]
            $val = $matches[2].Trim()
            if ($val -match '#') { $val = ($val -split '#', 2)[0].Trim() }
            $val = $val.Trim('"').Trim("'")
            if ($key -eq "SUPABASE_DB_URL" -and -not $env:SUPABASE_DB_URL) { $env:SUPABASE_DB_URL = $val }
            if ($key -eq "SUPABASE_ACCESS_TOKEN" -and -not $env:SUPABASE_ACCESS_TOKEN) { $env:SUPABASE_ACCESS_TOKEN = $val }
            if ($key -eq "VITE_FIREBASE_PROJECT_ID" -and -not $env:FIREBASE_PROJECT_ID) { $env:FIREBASE_PROJECT_ID = $val }
        }
    }
}

Write-Host "`n=== Firebase Auth – kompletny setup ===`n" -ForegroundColor Cyan

# 1) npm install
Write-Host "[1/5] npm install ..." -ForegroundColor Cyan
npm install --silent 2>$null
if ($LASTEXITCODE -ne 0) { npm install }
Write-Host "      OK" -ForegroundColor Green

# 2) Supabase migracie – skus db push (CLI)
Write-Host "`n[2/5] Supabase migracie (db push) ..." -ForegroundColor Cyan
$pushOk = $false
try {
    $null = npx supabase link --project-ref $SupabaseProjectRef 2>&1
    if ($LASTEXITCODE -eq 0) {
        npx supabase db push 2>&1
        if ($LASTEXITCODE -eq 0) { $pushOk = $true }
    }
} catch {}
if (-not $pushOk) {
    Write-Host "      Preskocene (nemas pristup k Supabase CLI alebo link zlyhal)." -ForegroundColor Yellow
    Write-Host "      Migracie spustis cez psql:" -ForegroundColor Yellow
    Write-Host "        `$env:SUPABASE_DB_URL = ""postgresql://postgres:HESLO@db.$SupabaseProjectRef.supabase.co:5432/postgres""" -ForegroundColor Gray
    Write-Host "        .\scripts\run-firebase-migrations-psql.ps1" -ForegroundColor Gray
} else {
    Write-Host "      OK – migracie pushnute" -ForegroundColor Green
}

# 3) Ak je SUPABASE_DB_URL, spust firebase migracie cez psql
if ($env:SUPABASE_DB_URL) {
    Write-Host "`n[3/5] Firebase migracie cez psql (SUPABASE_DB_URL je nastavena) ..." -ForegroundColor Cyan
    & (Join-Path $ProjectRoot "scripts\run-firebase-migrations-psql.ps1") -DbUrl $env:SUPABASE_DB_URL
    if ($LASTEXITCODE -eq 0) { Write-Host "      OK" -ForegroundColor Green }
} else {
    Write-Host "`n[3/5] Firebase migracie cez psql – preskocene (nastav SUPABASE_DB_URL a spust skript znova)" -ForegroundColor Yellow
}

# 4) Supabase config push (Third-Party Firebase)
Write-Host "`n[4/5] Supabase config push (auth.third_party.firebase) ..." -ForegroundColor Cyan
$configOk = $false
if ($env:FIREBASE_PROJECT_ID) {
    (Get-Content (Join-Path $ProjectRoot "supabase\config.toml") -Raw) -replace 'project_id = "your-firebase-project-id"', "project_id = `"$env:FIREBASE_PROJECT_ID`"" | Set-Content (Join-Path $ProjectRoot "supabase\config.toml") -NoNewline
}
try {
    $null = npx supabase link --project-ref $SupabaseProjectRef 2>&1
    if ($LASTEXITCODE -eq 0) {
        npx supabase config push 2>&1
        if ($LASTEXITCODE -eq 0) { $configOk = $true }
    }
} catch {}
if (-not $configOk) {
    Write-Host "      Preskocene (nemas pristup). Nastav Third-Party Auth v Supabase Dashboarde:" -ForegroundColor Yellow
    Write-Host "      Authentication -> Third-Party Auth -> pridaj Firebase, Project ID = tvoj Firebase Project ID" -ForegroundColor Gray
} else {
    Write-Host "      OK" -ForegroundColor Green
}

# 5) Vercel env – z .env ak existuju VITE_FIREBASE_*
Write-Host "`n[5/5] Vercel env premenne ..." -ForegroundColor Cyan
$envPath = Join-Path $ProjectRoot ".env"
if (Test-Path $envPath) {
    $hasFirebase = (Get-Content $envPath -Raw) -match "VITE_FIREBASE_"
    if ($hasFirebase) {
        try {
            & (Join-Path $ProjectRoot "scripts\set-vercel-firebase-env.ps1")
            Write-Host "      OK – Firebase env premenné z .env pridané do Vercel" -ForegroundColor Green
        } catch {
            Write-Host "      Spust manualne: .\scripts\set-vercel-firebase-env.ps1" -ForegroundColor Yellow
        }
    } else {
        Write-Host "      V .env nie su VITE_FIREBASE_*. Pridaj ich a spust: .\scripts\set-vercel-firebase-env.ps1" -ForegroundColor Yellow
    }
} else {
    Write-Host "      Po pridani VITE_FIREBASE_* do .env spust: .\scripts\set-vercel-firebase-env.ps1" -ForegroundColor Gray
}

Write-Host "`n=== Dokončene ===`n" -ForegroundColor Cyan
Write-Host "Dole treba manualne:" -ForegroundColor Yellow
Write-Host "1. Firebase Console – vytvor projekt / web app, zapni Email a Google Auth, skopiruj config do .env (VITE_FIREBASE_*)" -ForegroundColor White
Write-Host "2. Firebase – nastav custom claim role = 'authenticated' (blocking function alebo Admin SDK skript)" -ForegroundColor White
Write-Host "3. Supabase Dashboard – Authentication -> Third-Party Auth -> pridaj Firebase, zadaj Firebase Project ID" -ForegroundColor White
Write-Host "4. .env – pridaj VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID" -ForegroundColor White
Write-Host "5. Vercel – tie iste premenne do Environment Variables" -ForegroundColor White
Write-Host "`nNávod: docs\FIREBASE-AUTH-SETUP.md`n" -ForegroundColor Cyan
