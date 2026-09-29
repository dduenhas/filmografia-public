$ErrorActionPreference = "SilentlyContinue"
$b = "http://localhost:3000"

$login = Invoke-WebRequest "$b/login" -UseBasicParsing
Write-Host ("login              status={0} bootstrap={1}" -f $login.StatusCode, ($login.Content -match 'administrador'))

$r = Invoke-WebRequest "$b/" -UseBasicParsing -MaximumRedirection 0
Write-Host ("home sem sessao    status={0} location={1}" -f [int]$r.StatusCode, $r.Headers.Location)

$a = Invoke-WebRequest "$b/api/users" -UseBasicParsing
Write-Host ("api/users sem sess status={0}" -f [int]$a.StatusCode)

$rep = Invoke-WebRequest "$b/api/reports" -UseBasicParsing
Write-Host ("api/reports sem    status={0}" -f [int]$rep.StatusCode)
