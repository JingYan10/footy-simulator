# Downloads club logos from Wikipedia into Club_logos/<league>/<club>.png
# Uses each folder's _logo_names.txt. Skips logos that already exist unless -Force.
# Overrides in $titles pin the exact Wikipedia article when the search picks the wrong page.
param([switch]$Force, [string]$Only)
$onlyList = if ($Only) { $Only -split ',' | ForEach-Object { $_.Trim() } } else { @() }

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Join-Path (Split-Path $PSScriptRoot) 'Club_logos'
$ua = 'PitchToLegend/1.0 (personal offline football game; logo fetch)'
$country = @{
  'Premier League' = 'England'; 'Championship' = 'England'; 'League One' = 'England'
  'La Liga' = 'Spain'; 'Segunda División' = 'Spain'; 'Primera Federación' = 'Spain'
  'Serie A' = 'Italy'; 'Serie B' = 'Italy'; 'Serie C' = 'Italy'
  'Bundesliga' = 'Germany'; '2. Bundesliga' = 'Germany'; '3. Liga' = 'Germany'
  'Ligue 1' = 'France'; 'Ligue 2' = 'France'; 'National' = 'France'
}
$titles = @{}
$overrideFile = Join-Path $PSScriptRoot 'logo-titles.txt'
if (Test-Path $overrideFile) {
  Get-Content $overrideFile -Encoding UTF8 | Where-Object { $_ -match '=' } | ForEach-Object {
    $k, $v = $_ -split '=', 2
    $titles[$k.Trim()] = $v.Trim()
  }
}

# Wikipedia throttles fast clients: wait between requests and back off on HTTP 429.
function Invoke-Polite($url, $outFile) {
  foreach ($wait in 0, 5, 15, 40, 90) {
    if ($wait) { Start-Sleep -Seconds $wait }
    try {
      if ($outFile) { Invoke-WebRequest -Uri $url -UserAgent $ua -OutFile $outFile -UseBasicParsing; return $true }
      return Invoke-RestMethod -Uri $url -UserAgent $ua -UseBasicParsing
    } catch {
      if ($_.Exception.Message -notmatch "429") { throw }
    }
  }
  throw "still rate-limited"
}

function Get-Page($query, $isTitle) {
  $base = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages&piprop=thumbnail&pithumbsize=256&pilicense=any'
  $url = if ($isTitle) { "$base&titles=$([uri]::EscapeDataString($query))" }
         else { "$base&generator=search&gsrlimit=1&gsrsearch=$([uri]::EscapeDataString($query))" }
  $r = Invoke-Polite $url
  return $r.query.pages.PSObject.Properties.Value | Select-Object -First 1
}

$report = @()
foreach ($dir in Get-ChildItem $root -Directory) {
  $names = Get-Content (Join-Path $dir.FullName '_logo_names.txt') -Encoding UTF8 | Where-Object { $_ -like '*.png' }
  foreach ($file in $names) {
    $club = $file.Substring(0, $file.Length - 4)
    if ($onlyList.Count -and $onlyList -notcontains $club) { continue }
    $out = Join-Path $dir.FullName $file
    if ((Test-Path $out) -and -not $Force) { continue }
    $status = 'no image'; $title = ''
    try {
      $page = if ($titles.ContainsKey($club)) { Get-Page $titles[$club] $true } else { Get-Page "$club football club $($country[$dir.Name])" $false }
      $title = $page.title
      if ($page.thumbnail.source) {
        Invoke-Polite $page.thumbnail.source $out | Out-Null
        $status = 'ok'
      }
    } catch { $status = "error: $($_.Exception.Message)" }
    $report += [pscustomobject]@{ League = $dir.Name; Club = $club; Article = $title; Status = $status }
    Write-Host "$($dir.Name) | $club -> $title [$status]"
    Start-Sleep -Milliseconds 1500
  }
}
$report | Export-Csv (Join-Path $root '_download_report.csv') -NoTypeInformation -Encoding UTF8
Write-Host "Done: $(@($report | Where-Object Status -eq 'ok').Count) of $(@($report).Count) downloaded."
