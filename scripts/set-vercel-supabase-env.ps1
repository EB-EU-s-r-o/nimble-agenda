# Nastavi Vercel env premenne VITE_SUPABASE_* z lokálneho .env
# Použitie: .\scripts\set-vercel-supabase-env.ps1
# V .env musia byť: VITE_SUPABASE_URL, VITE_SUPABASE_PROJECT_ID, VITE_SUPABASE_PUBLISHABLE_KEY

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $root ".env"
Set-Location $root

if (-not (Test-Path $envFile)) {
    Write-Host "Subor .env neexistuje. Vytvor ho a pridaj VITE_SUPABASE_* premenné." -ForegroundColor Yellow
    exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^\s*#') { return }
    if ($line -match '^\s*VITE_SUPABASE_(URL|PROJECT_ID|PUBLISHABLE_KEY)\s*=\s*(.*)$') {
        $key = "VITE_SUPABASE_$($matches[1])"
        $val = $matches[2].Trim()
        if ($val -match '#') { $val = ($val -split '#', 2)[0].Trim() }
        $vars[$key] = $val.Trim('"').Trim("'")
    }
}

$required = @("VITE_SUPABASE_URL", "VITE_SUPABASE_PROJECT_ID", "VITE_SUPABASE_PUBLISHABLE_KEY")
$missing = $required | Where-Object { -not $vars[$_] }
if ($missing.Count -gt 0) {
    Write-Host "V .env chybaju: $($missing -join ', '). Pridaj ich (Supabase Dashboard -> Settings -> API)." -ForegroundColor Yellow
    exit 1
}

$tempDir = [System.IO.Path]::GetTempPath()
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
try {
foreach ($name in $required) {
    $value = $vars[$name]
    $tmpFile = Join-Path $tempDir "vercel_supabase_$([Guid]::NewGuid().ToString('N').Substring(0,8)).txt"
    try {
        [System.IO.File]::WriteAllText($tmpFile, $value)
        foreach ($env in "production", "preview") {
            vercel env rm $name $env --yes 2>$null | Out-Null
            Get-Content $tmpFile -Raw | vercel env add $name $env 2>$null
            if ($LASTEXITCODE -ne 0) {
                Write-Host "Chyba pri nastaveni $name pre $env. Najprv spust v tomto priečinku: vercel link" -ForegroundColor Red
                exit 1
            }
        }
        Write-Host "OK: $name" -ForegroundColor Green
    } finally {
        if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }
    }
}
} finally {
    $ErrorActionPreference = $prevErrorAction
}
Write-Host "`nSupabase env premenné sú vo Vercel. Spust redeploy: vercel --prod" -ForegroundColor Cyan
