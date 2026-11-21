# Builds the store app's web files into app\www: the game without anything trademarked or borrowed.
#   Left out: Club_logos and Comp_logos (real crests), js\logos-tur.js and js\logos-bel.js (packed real crests and
#   competition logos), js\lux-img.js (Wikipedia photos of real cars and watches), sw.js (the app works offline anyway).
#   The page sets window.STORE_BUILD, so badges are always the abstract ones and there is no switch.
# Then copies them into the Android project. Run from anywhere:  .\build-app.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$app = Join-Path $root 'app'
$www = Join-Path $app 'www'
$skip = @('logos-tur.js', 'logos-bel.js', 'lux-img.js')

if (Test-Path $www) { Remove-Item $www -Recurse -Force }
New-Item -ItemType Directory -Force "$www\js", "$www\css" | Out-Null
Copy-Item "$root\css\style.css" "$www\css\"
Copy-Item "$root\icon.svg", "$root\manifest.json" $www
Get-ChildItem "$root\js\*.js" | Where-Object { $skip -notcontains $_.Name } | Copy-Item -Destination "$www\js\"

# index.html without the left-out scripts, with the store flag before the game code.
$html = Get-Content "$root\index.html" -Raw -Encoding UTF8
foreach ($s in $skip) { $html = $html -replace "(?m)^\s*<script src=`"js/$([regex]::Escape($s))`"></script>\r?\n", '' }
$html = $html -replace '(\s*)<script src="js/ui.js"></script>', "`$1<script>window.STORE_BUILD = true;</script>`$1<script src=`"js/ui.js`"></script>"
[IO.File]::WriteAllText("$www\index.html", $html, (New-Object Text.UTF8Encoding $false))

# Safety check: nothing trademarked may slip into the package.
$bad = Get-ChildItem $www -Recurse | Where-Object { $_.Name -match 'logos-|lux-img' -or $_.FullName -match 'Club_logos|Comp_logos' }
if ($bad) { throw "Store build contains left-out files: $($bad.FullName -join ', ')" }
if ((Get-Content "$www\index.html" -Raw) -notmatch 'STORE_BUILD = true') { throw 'Store flag missing from index.html' }
$size = [math]::Round(((Get-ChildItem $www -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "Store web files ready in app\www ($size MB)"

# Copy into the Android project when it exists.
if (Test-Path "$app\android") {
  Push-Location $app
  try { npx cap sync android } finally { Pop-Location }
}
