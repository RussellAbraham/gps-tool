# GPS Tool - Development HTTP Server
#
# A lightweight dependency-free HTTP server for local development.
# Uses .NET's HttpListener through PowerShell.
#
# Features:
#   - Localhost access
#   - LAN access from mobile devices
#   - Automatic IPv4 address detection
#   - Basic MIME type handling
#   - Request logging
#   - Clean Ctrl+C shutdown
#
# Usage:
#
#   From the repository root:
#
#       .\bin\server.ps1
#
# Press Ctrl+C to stop the server.


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

$Root = (Get-Location).Path
$Port = 8080


# ---------------------------------------------------------------------------
# MIME Types
# ---------------------------------------------------------------------------

$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
}


function Get-ContentType($File) {

    $Extension = [System.IO.Path]::GetExtension($File).ToLower()

    if ($MimeTypes.ContainsKey($Extension)) {
        return $MimeTypes[$Extension]
    }

    return "application/octet-stream"
}


# ---------------------------------------------------------------------------
# Network Information
# ---------------------------------------------------------------------------

function Get-LocalIPv4Addresses {

    Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -ne "127.0.0.1" -and
            $_.IPAddress -notlike "169.254.*"
        } |
        Select-Object -ExpandProperty IPAddress
}


# ---------------------------------------------------------------------------
# HTTP Listener
# ---------------------------------------------------------------------------

$Listener = [System.Net.HttpListener]::new()

# Listen on all network interfaces.
$Listener.Prefixes.Add("http://+:$Port/")


# ---------------------------------------------------------------------------
# Shutdown Handling
# ---------------------------------------------------------------------------

$Stopping = $false

$CancelHandler = {

    if (-not $Stopping) {

        $Stopping = $true

        Write-Host ""
        Write-Host "Stopping server..."

        $Listener.Stop()
        $Listener.Close()
    }
}


# Register Ctrl+C handling.
[Console]::CancelKeyPress += $CancelHandler


# ---------------------------------------------------------------------------
# Start Server
# ---------------------------------------------------------------------------

try {

    $Listener.Start()

    $LocalIPs = Get-LocalIPv4Addresses

    Write-Host ""
    Write-Host "GPS Tool Development Server"
    Write-Host "---------------------------"
    Write-Host "Root:   $Root"
    Write-Host "Local:  http://localhost:$Port/"

    foreach ($IP in $LocalIPs) {
        Write-Host "LAN:    http://$IP`:$Port/"
    }

    Write-Host ""
    Write-Host "Press Ctrl+C to stop."
    Write-Host ""


    # -----------------------------------------------------------------------
    # Request Loop
    # -----------------------------------------------------------------------

    while ($Listener.IsListening -and -not $Stopping) {

        # Begin waiting for a request without permanently blocking the
        # PowerShell process.
        $AsyncResult = $Listener.BeginGetContext($null, $null)

        # Check periodically so Ctrl+C can be processed.
        while (-not $AsyncResult.AsyncWaitHandle.WaitOne(100)) {

            if ($Stopping) {
                break
            }
        }

        if ($Stopping -or -not $Listener.IsListening) {
            break
        }

        try {
            $Context = $Listener.EndGetContext($AsyncResult)
        }
        catch {
            if (-not $Stopping) {
                Write-Host "Error accepting request: $($_.Exception.Message)"
            }

            break
        }


        # -------------------------------------------------------------------
        # Request
        # -------------------------------------------------------------------

        $Request = $Context.Request
        $Response = $Context.Response

        $Path = [System.Uri]::UnescapeDataString(
            $Request.Url.AbsolutePath
        )


        # The root URL opens our hardware test page.
        if ($Path -eq "/") {
            $Path = "/test/index.html"
        }


        # Convert the URL path into a local Windows path.
        $RelativePath = $Path.TrimStart("/") -replace "/", "\"
        $File = Join-Path $Root $RelativePath

        Write-Host "$($Request.HttpMethod) $Path"


        # -------------------------------------------------------------------
        # Serve File
        # -------------------------------------------------------------------

        if (Test-Path $File -PathType Leaf) {

            try {

                $Bytes = [System.IO.File]::ReadAllBytes($File)

                $Response.StatusCode = 200
                $Response.ContentType = Get-ContentType $File
                $Response.ContentLength64 = $Bytes.Length

                $Response.OutputStream.Write(
                    $Bytes,
                    0,
                    $Bytes.Length
                )
            }
            catch {

                $Response.StatusCode = 500

                $Message = "500 - Internal Server Error"
                $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Message)

                $Response.OutputStream.Write(
                    $Bytes,
                    0,
                    $Bytes.Length
                )
            }
        }


        # -------------------------------------------------------------------
        # File Not Found
        # -------------------------------------------------------------------

        else {

            $Response.StatusCode = 404

            $Message = "404 - Not Found"
            $Bytes = [System.Text.Encoding]::UTF8.GetBytes($Message)

            $Response.OutputStream.Write(
                $Bytes,
                0,
                $Bytes.Length
            )
        }


        # Finish the response.
        $Response.Close()
    }
}


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

finally {

    if ($Listener.IsListening) {
        $Listener.Stop()
    }

    $Listener.Close()

    [Console]::CancelKeyPress -= $CancelHandler

    Write-Host ""
    Write-Host "Server stopped."
}