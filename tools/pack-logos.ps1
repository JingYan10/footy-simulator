# Packs club crests into js/logos-tur.js as small data URIs (96px), so the phone version needs one
# file instead of one per club. Run after fetch-logos.ps1 adds or changes logos in these folders.
param([string[]]$Leagues = @('Süper Lig', '1. Lig', '2. Lig'), [int]$Max = 96)
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
$js = "// Turkish club crests, packed into one file (the phone version can only hold so many separate files).`n// Key: '<league folder>/<club name>'. Rebuild from Club_logos with tools/pack-logos.ps1.`nconst LOGO_DATA = {`n" + ($entries -join "`n") + "`n};`n"
[IO.File]::WriteAllText("$root\js\logos-tur.js", $js, (New-Object Text.UTF8Encoding $false))
Write-Host "$($entries.Count) crests packed into js/logos-tur.js"
