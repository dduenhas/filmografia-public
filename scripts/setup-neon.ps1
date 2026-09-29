$ErrorActionPreference = "Stop"
$pid_ = "winter-sunset-88116901"

# Busca as duas connection strings no Neon (branch production)
$pooled = (npx --yes neonctl@latest connection-string production --project-id $pid_ --role-name neondb_owner --database-name neondb --pooled).Trim()
$direct = (npx --yes neonctl@latest connection-string production --project-id $pid_ --role-name neondb_owner --database-name neondb).Trim()

if (-not $pooled -or -not $direct) { throw "Falha ao obter connection strings" }

# Garante sslmode=require
if ($pooled -notmatch "sslmode=") { $pooled = "$pooled`?sslmode=require" }
if ($direct -notmatch "sslmode=") { $direct = "$direct`?sslmode=require" }

# Grava no .env substituindo as linhas
$env_path = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
$lines = Get-Content $env_path
$out = foreach ($line in $lines) {
  if ($line -match '^DATABASE_URL=') { "DATABASE_URL=`"$pooled`"" }
  elseif ($line -match '^DIRECT_URL=') { "DIRECT_URL=`"$direct`"" }
  else { $line }
}
Set-Content -Path $env_path -Value $out -Encoding utf8

# Confirma mascarando a senha
function Mask($s) { ($s -replace '://([^:]+):([^@]+)@', '://$1:****@') }
"DATABASE_URL => " + (Mask $pooled)
"DIRECT_URL   => " + (Mask $direct)
"OK gravado no .env"
