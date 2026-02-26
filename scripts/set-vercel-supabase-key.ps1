# Nastavi VITE_SUPABASE_PUBLISHABLE_KEY vo Vercel (production + preview).
# Použitie: .\scripts\set-vercel-supabase-key.ps1 -AnonKey "eyJ..."
# Anon key získaš: Supabase Dashboard -> projekt hrkwqdvfeudxkqttpgls -> Settings -> API -> anon public

param(
    [Parameter(Mandatory = $true)]
    [string]$AnonKey
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root

$keyFile = [System.IO.Path]::GetTempFileName()
try {
    [System.IO.File]::WriteAllText($keyFile, $AnonKey.Trim())

    foreach ($env in "production", "preview") {
        vercel env rm VITE_SUPABASE_PUBLISHABLE_KEY $env --yes 2>$null
        Get-Content $keyFile -Raw | vercel env add VITE_SUPABASE_PUBLISHABLE_KEY $env
    }
    Write-Host "VITE_SUPABASE_PUBLISHABLE_KEY nastaveny. Spust redeploy: vercel --prod"
} finally {
    Remove-Item $keyFile -Force -ErrorAction SilentlyContinue
}
