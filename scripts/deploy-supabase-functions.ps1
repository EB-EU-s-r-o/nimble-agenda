# Deploy Supabase Edge Functions; filters out "Docker is not running" warning (harmless on deploy).
# Usage: .\scripts\deploy-supabase-functions.ps1 [function1] [function2] ...
# No args = deploy all. Example: .\scripts\deploy-supabase-functions.ps1 create-public-booking save-smtp-config

if ($args) {
  $args | ForEach-Object { npx supabase functions deploy $_ 2>&1 | Where-Object { $_ -notmatch "Docker" } }
} else {
  npx supabase functions deploy 2>&1 | Where-Object { $_ -notmatch "Docker" }
}
