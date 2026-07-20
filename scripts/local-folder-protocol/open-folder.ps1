param([string]$Uri)

$path = $Uri -replace '^openlocal:', ''
$path = [System.Uri]::UnescapeDataString($path)

Start-Process explorer.exe -ArgumentList "`"$path`""
