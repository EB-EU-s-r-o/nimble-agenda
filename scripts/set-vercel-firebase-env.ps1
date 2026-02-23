# Nastavi Vercel env premenne VITE_FIREBASE_* z lokálneho .env
# Použitie: .\scripts\set-vercel-firebase-env.ps1
# Predtým: v .env musia byť VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envFile = Join-Path $root ".env"
Set-Location $root

if (-not (Test-Path $envFile)) {
    Write-Host "Subor .env neexistuje. Vytvor ho a pridaj VITE_FIREBASE_* premenné." -ForegroundColor Yellow
    exit 1
}

$vars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*VITE_FIREBASE_(\w+)\s*=\s*(.*)$') {
        $vars["VITE_FIREBASE_$($matches[1])"] = $matches[2].Trim().Trim('"').Trim("'")
    }
}

if ($vars.Count -eq 0) {
    Write-Host "V .env nie su ziadne VITE_FIREBASE_* premenné." -ForegroundColor Yellow
    exit 1
}

$tempDir = [System.IO.Path]::GetTempPath()
foreach ($name in $vars.Keys) {
    $value = $vars[$name]
    $tmpFile = Join-Path $tempDir "vercel_env_$([Guid]::NewGuid().ToString('N').Substring(0,8)).txt"
    try {
        [System.IO.File]::WriteAllText($tmpFile, $value)
        foreach ($env in "production", "preview") {
            vercel env rm $name $env --yes 2>$null
            Get-Content $tmpFile -Raw | vercel env add $name $env 2>&1
        }
        Write-Host "OK: $name" -ForegroundColor Green
    } finally {
        if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force }
    }
}
Write-Host "`nFirebase env premenné sú vo Vercel. Spust redeploy: vercel --prod" -ForegroundColor Cyan
