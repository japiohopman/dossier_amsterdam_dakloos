$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8765
$allowedFiles = @(
  "index.html", "styles.css", "app.js",
  "presentatie.html", "presentatie.css", "presentatie.js"
)

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
try {
  $listener.Start()
} catch {
  Write-Host "Poort $port is al in gebruik. Sluit een eerdere lokale dossierwerkplek of pas de poort aan." -ForegroundColor Red
  throw
}

Write-Host ""
Write-Host "Dossier Amsterdam draait alleen op deze laptop." -ForegroundColor Green
Write-Host "Open: http://127.0.0.1:$port/index.html"
Write-Host "Druk op Ctrl+C in dit venster om de lokale server te stoppen."
Write-Host ""

Start-Process "http://127.0.0.1:$port/index.html"

try {
  while ($listener.IsListening) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
      $requestLine = $reader.ReadLine()
      while ($true) {
        $headerLine = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($headerLine)) { break }
      }

      $status = "200 OK"
      $body = [System.Text.Encoding]::UTF8.GetBytes("Niet gevonden.")
      $contentType = "text/plain; charset=utf-8"

      if ($requestLine) {
        $parts = $requestLine.Split(" ")
        if ($parts.Length -ge 2 -and $parts[0] -eq "GET") {
          $target = $parts[1].Split("?")[0]
          if ($target -eq "/") { $target = "/index.html" }
          $fileName = [System.Uri]::UnescapeDataString($target.TrimStart("/"))

          if ($allowedFiles -contains $fileName -and [System.IO.Path]::GetFileName($fileName) -eq $fileName) {
            $filePath = Join-Path $root $fileName
            if (Test-Path -LiteralPath $filePath -PathType Leaf) {
              $body = [System.IO.File]::ReadAllBytes($filePath)
              $contentType = switch ([System.IO.Path]::GetExtension($fileName).ToLowerInvariant()) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "text/javascript; charset=utf-8" }
                default { "application/octet-stream" }
              }
            } else {
              $status = "404 Not Found"
            }
          } else {
            $status = "404 Not Found"
          }
        } else {
          $status = "405 Method Not Allowed"
        }
      }

      $crlf = [char]13 + [char]10
      $headers = "HTTP/1.1 $status" + $crlf +
        "Content-Type: $contentType" + $crlf +
        "Content-Length: $($body.Length)" + $crlf +
        "Connection: close" + $crlf +
        "Cache-Control: no-store" + $crlf +
        "X-Content-Type-Options: nosniff" + $crlf +
        "Referrer-Policy: no-referrer" + $crlf + $crlf
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      $stream.Write($body, 0, $body.Length)
      $stream.Flush()
      $reader.Dispose()
      $stream.Dispose()
    } catch {
      Write-Host "Verzoek kon niet worden verwerkt: $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
