# Picks each club's colours from its crest in Club_logos and writes js/badge-colors.js, which the abstract
# badges (store build) use. Only the colours are kept: no shapes or pictures from the real crests.
# Run after logos are added or changed:  .\badge-colors.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$N = 40 # crests are shrunk to 40px before counting colours

function Hex($c) { '#{0:X2}{1:X2}{2:X2}' -f $c[0], $c[1], $c[2] }
function Dist($a, $b) { [math]::Sqrt([math]::Pow($a[0] - $b[0], 2) + [math]::Pow($a[1] - $b[1], 2) + [math]::Pow($a[2] - $b[2], 2)) }

$entries = @()
foreach ($dir in Get-ChildItem -LiteralPath "$root\Club_logos" -Directory) {
  foreach ($f in Get-ChildItem -LiteralPath $dir.FullName -Filter *.png) {
    try { $img = [Drawing.Image]::FromFile($f.FullName) } catch { continue }
    $bmp = New-Object Drawing.Bitmap $N, $N
    $g = [Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'
    $g.DrawImage($img, 0, 0, $N, $N); $g.Dispose(); $img.Dispose()
    # A crest on a solid square: the corner colour is background, not a club colour.
    $corner = $bmp.GetPixel(0, 0); $bg = $null
    if ($corner.A -gt 200) { $bg = @($corner.R, $corner.G, $corner.B) }
    # Count colours in buckets of 16 per channel, keeping a running sum to get the real average colour.
    $counts = @{}
    for ($y = 0; $y -lt $N; $y++) { for ($x = 0; $x -lt $N; $x++) {
      $p = $bmp.GetPixel($x, $y)
      if ($p.A -lt 160) { continue }
      $rgb = @($p.R, $p.G, $p.B)
      if ($bg -and (Dist $rgb $bg) -lt 40) { continue }
      $k = (($p.R -shr 4) -shl 8) -bor (($p.G -shr 4) -shl 4) -bor ($p.B -shr 4)
      if (-not $counts.ContainsKey($k)) { $counts[$k] = @(0, 0, 0, 0) }
      $e = $counts[$k]; $e[0]++; $e[1] += $p.R; $e[2] += $p.G; $e[3] += $p.B
    } }
    $bmp.Dispose()
    # Biggest buckets first; keep up to three colours that are clearly different from each other.
    $picked = @()
    # Greys, white and black outlines fill a lot of crests, so strong colours count more than their area.
    $cands = foreach ($e in $counts.Values) {
      # Tiny specks (anti-aliased edges, small text) aren't club colours.
      if ($e[0] -lt 12) { continue }
      $c = @([int]($e[1] / $e[0]), [int]($e[2] / $e[0]), [int]($e[3] / $e[0]))
      $sat = (($c | Measure-Object -Maximum).Maximum - ($c | Measure-Object -Minimum).Minimum) / 255
      [pscustomobject]@{ c = $c; score = $e[0] * (0.3 + 1.7 * $sat) }
    }
    foreach ($cand in ($cands | Sort-Object score -Descending)) {
      $c = $cand.c
      if (@($picked | Where-Object { (Dist $_ $c) -lt 90 }).Count) { continue }
      $picked += , $c
      if ($picked.Count -eq 3) { break }
    }
    if (-not $picked.Count) { continue }
    while ($picked.Count -lt 3) { $picked += , $(if (($picked[0][0] + $picked[0][1] + $picked[0][2]) -gt 450) { @(17, 17, 17) } else { @(255, 255, 255) }) }
    $key = "$($dir.Name)/$($f.BaseName)" -replace '\\', '\\' -replace "'", "\'"
    $entries += "  '$key': ['$(Hex $picked[0])', '$(Hex $picked[1])', '$(Hex $picked[2])'],"
  }
}
$js = "// Club colours for the abstract badges, picked from each crest by tools/badge-colors.ps1. Colours only.`n// Key: '<league folder>/<club name>' -> [main, second, trim]. Hand-picked BADGE_COLORS in ui.js win over these.`nconst BADGE_PALETTE = {`n" + ($entries -join "`n") + "`n};`n"
[IO.File]::WriteAllText("$root\js\badge-colors.js", $js, (New-Object Text.UTF8Encoding $false))
Write-Host "$($entries.Count) clubs written to js/badge-colors.js"
