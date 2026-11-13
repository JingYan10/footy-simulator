# Packs competition logos from Comp_logos into js/logos-tur.js as small data URIs (COMP_LOGOS),
# so the phone version gets them without any new files. Each file is named after the competition
# as the game calls it (e.g. "La Liga.png", "Champions League.png"). Run again after adding or
# replacing a logo:  .\pack-comp-logos.ps1
param([int]$MaxH = 48, [int]$MaxW = 96)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$out = "$root\js\logos-tur.js"
$entries = @()
foreach ($f in Get-ChildItem -LiteralPath "$root\Comp_logos" -File | Sort-Object Name) {
  $img = [Drawing.Image]::FromFile($f.FullName)
  $s = [math]::Min(1.0, [math]::Min($MaxH / [double]$img.Height, $MaxW / [double]$img.Width))
  $w = [int][math]::Max(1, $img.Width * $s); $h = [int][math]::Max(1, $img.Height * $s)
  $bmp = New-Object Drawing.Bitmap $w, $h
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.SmoothingMode = 'HighQuality'; $g.PixelOffsetMode = 'HighQuality'
  $g.DrawImage($img, 0, 0, $w, $h); $img.Dispose()
  $ms = New-Object IO.MemoryStream
  $bmp.Save($ms, [Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
  $key = $f.BaseName -replace "'", "\'"
  $entries += "  '$key': 'data:image/png;base64,$([Convert]::ToBase64String($ms.ToArray()))',"
}
$block = @(
  '// --- competition logos (tools/pack-comp-logos.ps1) ---',
  '// Key: the competition name as the game uses it. Competitions without one show a coloured badge.',
  'const COMP_LOGOS = {'
) + $entries + @('};', '// --- end competition logos ---')
$text = [IO.File]::ReadAllText($out, [Text.UTF8Encoding]::new($false))
$start = $text.IndexOf('// --- competition logos (tools/pack-comp-logos.ps1) ---')
if ($start -ge 0) {
  $endMark = '// --- end competition logos ---'
  $end = $text.IndexOf($endMark, $start) + $endMark.Length
  $text = $text.Substring(0, $start).TrimEnd() + "`n" + $text.Substring($end).TrimStart("`r", "`n")
}
$text = $text.TrimEnd() + "`n`n" + ($block -join "`n") + "`n"
[IO.File]::WriteAllText($out, $text, [Text.UTF8Encoding]::new($false))
"Packed $($entries.Count) competition logos into js/logos-tur.js"
