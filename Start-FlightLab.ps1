param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$taskRoot = $PSScriptRoot
function Test-FlightLabHealth([string]$taskAddress) {
  $taskReply = $null
  $taskReader = $null
  try {
    $taskRequest = [System.Net.HttpWebRequest]::Create("$taskAddress/flightlab-health")
    $taskRequest.Proxy = $null
    $taskRequest.Timeout = 1200
    $taskReply = $taskRequest.GetResponse()
    $taskReader = New-Object System.IO.StreamReader($taskReply.GetResponseStream())
    return ($taskReader.ReadToEnd() -eq 'SpaceX-Flight-Lab-1')
  } catch { return $false }
  finally { if ($taskReader) { $taskReader.Dispose() }; if ($taskReply) { $taskReply.Dispose() } }
}
function Open-FlightLab([string]$taskAddress) {
  if (-not $NoBrowser) { Start-Process $taskAddress }
  Write-Output $taskAddress
}
$taskNode = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $taskNode) { $taskNode = 'C:\Program Files\nodejs\node.exe' }
if (-not (Test-Path -LiteralPath $taskNode)) {
  Add-Type -AssemblyName PresentationFramework
  [System.Windows.MessageBox]::Show('Please install Node.js, then open the simulator again.', 'Flight Lab') | Out-Null
  exit 1
}
foreach ($taskPort in 4173..4183) {
  $taskUrl = "http://127.0.0.1:$taskPort"
  if (Test-FlightLabHealth $taskUrl) { Open-FlightLab $taskUrl; exit }
  $taskListener = Get-NetTCPConnection -LocalPort $taskPort -State Listen -ErrorAction SilentlyContinue
  if ($taskListener) { continue }
  Start-Process -FilePath $taskNode -ArgumentList @(('"' + (Join-Path $taskRoot 'server.cjs') + '"'), '--port', "$taskPort") -WorkingDirectory $taskRoot -WindowStyle Hidden
  foreach ($taskAttempt in 1..35) {
    Start-Sleep -Milliseconds 150
    if (Test-FlightLabHealth $taskUrl) { Open-FlightLab $taskUrl; exit }
  }
}
Add-Type -AssemblyName PresentationFramework
[System.Windows.MessageBox]::Show('Unable to start the simulator. Please try again.', 'Flight Lab') | Out-Null
