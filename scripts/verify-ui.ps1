$ErrorActionPreference = "Stop"
$b = "http://localhost:3000"
$lb = @{ email = "admin@filmografia.test"; password = "admin12345" } | ConvertTo-Json
Invoke-WebRequest "$b/api/auth/login" -Method Post -ContentType "application/json" -Body $lb -SessionVariable s -UseBasicParsing | Out-Null

$d = Invoke-WebRequest "$b/dashboard" -UseBasicParsing -WebSession $s
Write-Host ("dashboard             status={0} Colaboradores={1} estatisticas={2}" -f $d.StatusCode, ($d.Content -match 'Colaboradores'), ($d.Content -match 'Filmes no cat'))

$g = Invoke-WebRequest "$b/?genres=Drama" -UseBasicParsing -WebSession $s
Write-Host ("filtro genres=Drama   status={0} Interestelar={1} Matrix={2}" -f $g.StatusCode, ($g.Content -match 'Interestelar'), ($g.Content -match 'Matrix'))

$y = Invoke-WebRequest "$b/?yearFrom=1990&yearTo=2000" -UseBasicParsing -WebSession $s
Write-Host ("filtro ano 1990-2000  status={0} Matrix={1} Interestelar={2}" -f $y.StatusCode, ($y.Content -match 'Matrix'), ($y.Content -match 'Interestelar'))

$rep = Invoke-WebRequest "$b/api/reports?genres=Drama" -UseBasicParsing -WebSession $s
Write-Host ("report filtrado       status={0} linhas={1}" -f $rep.StatusCode, (($rep.Content -split "`r`n").Count))
