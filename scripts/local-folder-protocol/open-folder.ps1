param([string]$Uri)

$path = $Uri -replace '^patrifolder:', ''
$path = [System.Uri]::UnescapeDataString($path)

Start-Process explorer.exe -ArgumentList "`"$path`""
