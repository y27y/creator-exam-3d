param(
  [string]$BaseUrl = 'http://127.0.0.1:3000',
  [string]$ChromePath = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false
$levels = @('flood-village', 'night-mine', 'giant-city', 'wordless-war', 'memory-plague', 'final-exam')
$outputDir = Join-Path $PSScriptRoot 'board-surface-qa'
New-Item -ItemType Directory -Force $outputDir | Out-Null

if (-not (Test-Path -LiteralPath $ChromePath)) {
  throw "Chrome was not found at $ChromePath"
}

for ($index = 0; $index -lt $levels.Count; $index += 1) {
  $levelId = $levels[$index]
  $output = Join-Path $outputDir ('{0:D2}-{1}.png' -f ($index + 1), $levelId)
  $profile = Join-Path $env:TEMP "creator-exam-board-qa-$PID-$index"
  $url = "$BaseUrl/?debug=1&boardQa=1&level=$index"
  $arguments = @(
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    "--user-data-dir=$profile",
    '--hide-scrollbars',
    '--window-size=1440,900',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=6000',
    "--screenshot=$output",
    $url
  )
  $ErrorActionPreference = 'Continue'
  & $ChromePath $arguments 2>$null
  $ErrorActionPreference = 'Stop'
  $global:LASTEXITCODE = 0
  if (-not (Test-Path -LiteralPath $output)) {
    throw "Screenshot was not created for $levelId"
  }
}

Write-Output 'Board surface visual QA captured all six image-2 levels.'
