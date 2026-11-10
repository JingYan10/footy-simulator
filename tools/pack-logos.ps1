# Packs club crests into one script of small data URIs (96px), so the phone version needs one file
# instead of one per club. Run after fetch-logos.ps1 adds or changes logos in these folders.
#   Turkey (defines LOGO_DATA):  .\pack-logos.ps1
#   Belgium (adds to it):        .\pack-logos.ps1 -Leagues 'Belgian Pro League','Challenger Pro League','Belgian Division 1' -Out logos-bel.js -Label Belgian
param([string[]]$Leagues = @('Süper Lig', '1. Lig', '2. Lig'), [int]$Max = 96, [string]$Out = 'logos-tur.js', [string]$Label = 'Turkish')
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$entries = @()
foreach ($d in $Leagues) {
  foreach ($f in Get-ChildItem -LiteralPath "$root\Club_logos\$d" -Filter *.png) {
    $img = [Drawing.Image]::FromFile($f.FullName)
    $s = [math]::Min(1.0, $Max / [double][math]::Max($img.Width, $img.Height))
    $w = [int][math]::Max(1, $img.Width * $s); $h = [int][math]::Max(1, $img.Height * $s)
    $bmp = New-Object Drawing.Bitmap $w, $h
    $g = [Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
    $g.DrawImage($img, 0, 0, $w, $h); $img.Dispose()
    $ms = New-Object IO.MemoryStream
    $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
    $key = "$d/$($f.BaseName)" -replace "'", "\'"
    $entries += "  '$key': 'data:image/png;base64,$([Convert]::ToBase64String($ms.ToArray()))',"
  }
}
# logos-tur.js defines LOGO_DATA; any other pack adds to it (load it after logos-tur.js).
$open = if ($Out -eq 'logos-tur.js') { "const LOGO_DATA = {" } else { "Object.assign(LOGO_DATA, {" }
$close = if ($Out -eq 'logos-tur.js') { "};" } else { "});" }
$js = "// $Label club crests, packed into one file (the phone version can only hold so many separate files).`n// Key: '<league folder>/<club name>'. Rebuild from Club_logos with tools/pack-logos.ps1.`n$open`n" + ($entries -join "`n") + "`n$close`n"
[IO.File]::WriteAllText("$root\js\$Out", $js, (New-Object Text.UTF8Encoding $false))
Write-Host "$($entries.Count) crests packed into js/$Out"
