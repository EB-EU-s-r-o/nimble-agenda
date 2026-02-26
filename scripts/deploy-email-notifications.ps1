# Email Notifications Deployment Script
# Run this script to deploy the email notification system

Write-Host "🚀 Deploying Email Notification System..." -ForegroundColor Cyan

# Check if supabase CLI is installed
$supabaseVersion = supabase --version 2>$null
if (-not $supabaseVersion) {
    Write-Host "❌ Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green

# Check if linked
Write-Host "`n📋 Checking Supabase project link..." -ForegroundColor Cyan
$projectRef = "hrkwqdvfeudxkqttpgls"
$currentLink = supabase status 2>&1 | Select-String -Pattern $projectRef

if (-not $currentLink) {
    Write-Host "🔗 Linking to project: $projectRef" -ForegroundColor Yellow
    supabase link --project-ref $projectRef
} else {
    Write-Host "✅ Already linked to project: $projectRef" -ForegroundColor Green
}

# Deploy database migrations
Write-Host "`n📊 Deploying database migrations..." -ForegroundColor Cyan
supabase db push

# Deploy edge functions
Write-Host "`n⚡ Deploying edge functions..." -ForegroundColor Cyan

$functions = @(
    "send-appointment-notification",
    "create-public-booking",
    "sync-push"
)

foreach ($func in $functions) {
    Write-Host "   Deploying: $func" -ForegroundColor Yellow
    supabase functions deploy $func
}

Write-Host "`n✅ Deployment complete!" -ForegroundColor Green
Write-Host "`n📧 Email notification system is now live!" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor White
Write-Host "   1. Configure SMTP in admin settings" -ForegroundColor Yellow
Write-Host "   2. Test by creating an appointment" -ForegroundColor Yellow
Write-Host "   3. Check notification logs in Supabase dashboard" -ForegroundColor Yellow
