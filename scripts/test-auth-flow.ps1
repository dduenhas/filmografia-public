$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function Show($label, $val) { Write-Host ("{0,-34} {1}" -f $label, $val) }

# ---- 1. Bootstrap do ADMIN (ou login, se já existir) ----
$adminEmail = "admin@filmografia.test"
$adminPass  = "admin12345"
$sess = $null
try {
  $body = @{ name = "Admin User"; email = $adminEmail; password = $adminPass; confirmPassword = $adminPass } | ConvertTo-Json
  $r = Invoke-WebRequest "$base/api/auth/bootstrap" -Method Post -ContentType "application/json" -Body $body -SessionVariable sess -UseBasicParsing
  Show "bootstrap" "OK ($($r.StatusCode)) role=$(($r.Content | ConvertFrom-Json).role)"
} catch {
  Show "bootstrap" "já existe ($($_.Exception.Response.StatusCode.value__)) → login"
  $body = @{ email = $adminEmail; password = $adminPass } | ConvertTo-Json
  $r = Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body $body -SessionVariable sess -UseBasicParsing
  Show "login" "OK ($($r.StatusCode)) role=$(($r.Content | ConvertFrom-Json).role)"
}

# ---- 2. Importar filmes (exige sessão) ----
$ids = @()
foreach ($tmdb in @(157336, 603, 680)) {  # Interestelar, Matrix, Pulp Fiction
  $r = Invoke-RestMethod "$base/api/movies" -Method Post -ContentType "application/json" -Body (@{ tmdbId = $tmdb } | ConvertTo-Json) -WebSession $sess
  $ids += $r.id
  Show "import tmdb=$tmdb" "$($r.title) (id=$($r.id))"
}

# ---- 3. PATCH favorito/nota/anotações no primeiro ----
$patch = @{ favorite = $true; watched = $true; personalRating = 10; notes = "Obra-prima." } | ConvertTo-Json
$r = Invoke-RestMethod "$base/api/movies/$($ids[0])" -Method Patch -ContentType "application/json" -Body $patch -WebSession $sess
Show "patch" "fav=$($r.favorite) watched=$($r.watched) nota=$($r.personalRating)"

# ---- 4. Home com filtro de gênero ----
$homeResp = Invoke-WebRequest "$base/?tab=favorites" -UseBasicParsing -WebSession $sess
Show "home favoritos" "status=$($homeResp.StatusCode) tem Interestelar=$($homeResp.Content -match 'Interestelar')"

# ---- 5. Relatório CSV (completo) ----
$csv = Invoke-WebRequest "$base/api/reports" -UseBasicParsing -WebSession $sess
$lines = ($csv.Content -split "`r`n").Count
Show "relatório CSV" "status=$($csv.StatusCode) linhas=$lines disposition=$($csv.Headers['Content-Disposition'])"

# ---- 6. Gestão de colaboradores (ADMIN) ----
$collab = @{ name = "Collab User"; email = "maria@filmografia.test"; password = "colab12345"; role = "COLLABORATOR" } | ConvertTo-Json
try {
  $r = Invoke-RestMethod "$base/api/users" -Method Post -ContentType "application/json" -Body $collab -WebSession $sess
  Show "criar colaborador" "OK id=$($r.id) role=$($r.role)"
} catch { Show "criar colaborador" "já existe/erro: $($_.Exception.Message)" }
$users = Invoke-RestMethod "$base/api/users" -WebSession $sess
Show "listar usuários" "total=$($users.Count)"

# ---- 7. Segurança: sem sessão → 401 ----
try {
  Invoke-WebRequest "$base/api/users" -UseBasicParsing | Out-Null
  Show "sem sessão /api/users" "FALHOU (deveria 401)"
} catch {
  Show "sem sessão /api/users" "bloqueado ($($_.Exception.Response.StatusCode.value__)) ✔"
}

# ---- 8. Colaborador não acessa /api/users (403) ----
$csess = $null
$lb = @{ email = "maria@filmografia.test"; password = "colab12345" } | ConvertTo-Json
try {
  Invoke-WebRequest "$base/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -SessionVariable csess -UseBasicParsing | Out-Null
  try {
    Invoke-WebRequest "$base/api/users" -UseBasicParsing -WebSession $csess | Out-Null
    Show "colaborador /api/users" "FALHOU (deveria 403)"
  } catch { Show "colaborador /api/users" "bloqueado ($($_.Exception.Response.StatusCode.value__)) ✔" }
  # mas consegue importar
  $r = Invoke-RestMethod "$base/api/movies" -Method Post -ContentType "application/json" -Body (@{ tmdbId = 27205 } | ConvertTo-Json) -WebSession $csess
  Show "colaborador importa filme" "OK $($r.title)"
} catch { Show "login colaborador" "erro: $($_.Exception.Message)" }

Write-Host "`n=== FIM DO TESTE ==="
