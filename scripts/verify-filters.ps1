$ErrorActionPreference = "Stop"
$b = "http://localhost:3000"
$lb = @{ email = "admin@filmografia.test"; password = "admin12345" } | ConvertTo-Json
Invoke-WebRequest "$b/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -SessionVariable s -UseBasicParsing | Out-Null

function Titles($qs, $label) {
  $r = Invoke-WebRequest "$b/api/reports?$qs" -UseBasicParsing -WebSession $s
  $rows = ($r.Content -split "`r`n") | Select-Object -Skip 1 | Where-Object { $_ -ne "" }
  $t = $rows | ForEach-Object { ($_ -split ';')[0].Trim('"') }
  Write-Host ("{0,-26} [{1}] {2}" -f $label, $rows.Count, ($t -join ", "))
}

Titles "" "completo"
Titles "genres=Drama" "genres=Drama"
Titles "genres=Aventura" "genres=Aventura"
Titles "yearFrom=1990&yearTo=2000" "ano 1990-2000"
Titles "yearFrom=2010&yearTo=2020" "ano 2010-2020"
Titles "director=Nolan" "director contem Nolan"
Titles "cast=Keanu" "cast contem Keanu"
Titles "cast=Reeves" "cast contem Reeves"
Titles "company=Warner" "produtora contem Warner"
Titles "tab=favorites" "tab=favorites"
Titles "q=Matrix" "q=Matrix"
