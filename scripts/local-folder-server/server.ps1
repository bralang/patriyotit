# Tiny local helper: listens on 127.0.0.1 and opens File Explorer at a
# path given via GET /open?path=... — called from the app with fetch(),
# which browsers don't gate behind any "open external app?" confirmation.
# Loopback TCP on an unprivileged port needs no admin rights and no URL ACL.

$port = 47821
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "Patriyotit folder-open helper listening on http://127.0.0.1:$port/"

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII)
        $requestLine = $reader.ReadLine()
        while (($line = $reader.ReadLine()) -and $line -ne '') {}

        $method = $null
        $target = $null
        if ($requestLine -match '^(GET|OPTIONS)\s+(\S+)\s+HTTP') {
            $method = $matches[1]
            $target = $matches[2]
        }

        $writer = New-Object System.IO.StreamWriter($stream, [System.Text.Encoding]::ASCII)
        $writer.AutoFlush = $true
        $cors = "Access-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`n"

        if ($method -eq 'OPTIONS') {
            $writer.Write("HTTP/1.1 204 No Content`r`n$cors`r`n")
        } elseif ($target -like '/open?*') {
            $query = $target.Substring($target.IndexOf('?') + 1)
            $folderPath = $null
            foreach ($pair in $query -split '&') {
                $kv = $pair -split '=', 2
                if ($kv.Length -eq 2 -and $kv[0] -eq 'path') {
                    $folderPath = [System.Uri]::UnescapeDataString($kv[1])
                }
            }
            if ($folderPath) {
                Start-Process explorer.exe -ArgumentList "`"$folderPath`""
                $body = "OK"
                $writer.Write("HTTP/1.1 200 OK`r`n${cors}Content-Length: $($body.Length)`r`nContent-Type: text/plain`r`n`r`n$body")
            } else {
                $writer.Write("HTTP/1.1 400 Bad Request`r`n$cors`r`n")
            }
        } else {
            $writer.Write("HTTP/1.1 404 Not Found`r`n$cors`r`n")
        }
    } catch {
        Write-Host "Request error: $($_.Exception.Message)"
    } finally {
        $client.Close()
    }
}
