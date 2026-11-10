# Downloads national flags (80px wide PNGs from flagcdn.com) into Flags/<code>.png and packs them into
# js/flags.js as data URIs, keyed by the game's three-letter nation codes. Skips flags already there.
param([switch]$Force)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$root = Split-Path $PSScriptRoot
$dir = Join-Path $root 'Flags'
New-Item -ItemType Directory -Force $dir | Out-Null
$iso = @{
  ENG='gb-eng'; SCO='gb-sct'; WAL='gb-wls'; IRL='ie'; ESP='es'; ITA='it'; GER='de'; FRA='fr'; POR='pt'; NED='nl'; BEL='be'
  NOR='no'; SWE='se'; DEN='dk'; SUI='ch'; AUT='at'; CRO='hr'; SRB='rs'; POL='pl'; TUR='tr'; UKR='ua'
  BRA='br'; ARG='ar'; URU='uy'; COL='co'; ECU='ec'; CHI='cl'; PER='pe'; PAR='py'; VEN='ve'; BOL='bo'
  USA='us'; MEX='mx'; CAN='ca'; PAN='pa'; CRC='cr'; JAM='jm'
  JPN='jp'; KOR='kr'; CHN='cn'; MAS='my'; SGP='sg'; IDN='id'; THA='th'; VIE='vn'; AUS='au'; IRN='ir'; KSA='sa'; QAT='qa'; IRQ='iq'; UAE='ae'; UZB='uz'; JOR='jo'
  NGA='ng'; SEN='sn'; CIV='ci'; GHA='gh'; MAR='ma'; EGY='eg'; CMR='cm'; ALG='dz'; TUN='tn'; RSA='za'; MLI='ml'; COD='cd'; BFA='bf'; GUI='gn'; CPV='cv'; GAB='ga'; ANG='ao'; ZAM='zm'
  SVK='sk'; CZE='cz'; BIH='ba'; ISR='il'; HUN='hu'; KOS='xk'; GRE='gr'; SVN='si'; ROU='ro'; ALB='al'; MNE='me'; GEO='ge'; NIR='gb-nir'; TOG='tg'; ISL='is'
  LUX='lu'; GAM='gm'; NZL='nz'; MKD='mk'; ARM='am'; EQG='gq'; BEN='bj'; RUS='ru'; GUF='gf'; FIN='fi'; MOZ='mz'; HAI='ht'; PLE='ps'; CHA='td'
}
foreach ($k in $iso.Keys) {
  $out = Join-Path $dir "$k.png"
  if ((Test-Path $out) -and -not $Force) { continue }
  try { Invoke-WebRequest -Uri "https://flagcdn.com/w80/$($iso[$k]).png" -OutFile $out -UseBasicParsing -UserAgent 'PitchToLegend/1.0 (offline football game)' }
  catch { Write-Host "$k failed: $($_.Exception.Message)" }
  Start-Sleep -Milliseconds 200
}
$entries = Get-ChildItem $dir -Filter *.png | Sort-Object BaseName | ForEach-Object { "  $($_.BaseName): 'data:image/png;base64,$([Convert]::ToBase64String([IO.File]::ReadAllBytes($_.FullName)))'," }
$js = "// National flags (flagcdn.com, 80px), packed into one file for the phone version. Key: nation code.`n// Rebuild with tools/fetch-flags.ps1.`nconst FLAG_DATA = {`n" + ($entries -join "`n") + "`n};`n"
[IO.File]::WriteAllText("$root\js\flags.js", $js, (New-Object Text.UTF8Encoding $false))
Write-Host "$(@($entries).Count) flags packed into js/flags.js"
