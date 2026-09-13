# Замена двух фото с мелких исходников и аккуратный кадр 4:3.
#
# «Фраппе» был 768×1024, «Шаурма» — 510×360: при приведении к 1200×900 их
# растягивало, отсюда мыло. Теперь взяты крупные исходники, а кроп считается
# с учётом того, что в вертикальном кадре стакан стоит выше геометрического
# центра: смещение 42% от верха вместо 50%.
#
# Запуск: powershell -ExecutionPolicy Bypass -File tools\refit-photos.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'assets'
$backup = Join-Path $dir '_original'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$targetW = 1200
$targetH = 900
$quality = 85
$bias = 0.42   # доля высоты сверху, откуда начинается кадр

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $quality

# слот → новый файл-источник на Commons (выбран по названию)
$replace = @(
  @{ slot = 'frappe';   title = 'Frappe (4547117210).jpg' },
  @{ slot = 'shawarma'; title = 'Döner Kebab Wrap - What The Pitta.jpg' }
)

$ua = 'MADROCK-coffee-site/1.0 (photo refit)'

foreach ($item in $replace) {
  $api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2000&titles=' +
         [uri]::EscapeDataString('File:' + $item.title)
  $json = Invoke-RestMethod -Uri $api -Headers @{ 'user-agent' = $ua } -TimeoutSec 60
  $page = $json.query.pages.PSObject.Properties.Value | Select-Object -First 1
  $info = $page.imageinfo[0]
  if (-not $info) { Write-Output ('  ✗ ' + $item.slot + ': файл не найден'); continue }

  $src = Join-Path $dir ($item.slot + '-source.jpg')
  Invoke-WebRequest -Uri $info.thumburl -OutFile $src -Headers @{ 'user-agent' = $ua } -TimeoutSec 120

  $img = [System.Drawing.Image]::FromFile($src)
  $w = $img.Width; $h = $img.Height
  if ($w -lt $targetW) { Write-Output ('  ! ' + $item.slot + ': исходник ' + $w + ' px — меньше целевых ' + $targetW) }

  # кадр 4:3 со смещением вверх
  $ratio = $targetW / $targetH
  if ($w / $h -gt $ratio) { $cropH = $h; $cropW = [int]($h * $ratio) }
  else { $cropW = $w; $cropH = [int]($w / $ratio) }
  $cropX = [int](($w - $cropW) / 2)
  $cropY = [int](($h - $cropH) * $bias)
  if ($cropY -lt 0) { $cropY = 0 }
  if ($cropY + $cropH -gt $h) { $cropY = $h - $cropH }

  $srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $targetW, $targetH
  $out = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(20, 16, 14))
  $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose(); $img.Dispose()

  $target = Join-Path $dir ($item.slot + '.jpg')
  $archive = Join-Path $backup ($item.slot + '.jpg')
  if (Test-Path $target) { Copy-Item $target $archive -Force }
  if (Test-Path $target) { Remove-Item $target -Force }
  $out.Save($target, $codec, $params)
  $out.Dispose()
  Remove-Item $src -Force

  $size = (Get-Item $target).Length
  Write-Output ('  ✓ ' + $item.slot.PadRight(10) + 'источник ' + $w + '×' + $h + ' → кадр ' + $cropW + '×' + $cropH + ' со смещением ' + [int]($bias * 100) + '% → ' + $targetW + '×' + $targetH + ', ' + [math]::Round($size / 1024) + ' КБ')
}

# дописываем источники
$rows = foreach ($item in $replace) {
  '| ' + $item.slot + '.jpg | [' + $item.title + '](https://commons.wikimedia.org/wiki/' + [uri]::EscapeDataString('File:' + $item.title) + ') | не указан | см. страницу файла |'
}
$block = "`n## Замена фото с мелких исходников`n`n| Файл | Файл-источник | Автор | Лицензия |`n|---|---|---|---|`n" + ($rows -join "`n") + "`n"
Add-Content -Path (Join-Path $dir 'SOURCES.md') -Value $block -Encoding UTF8
Write-Output 'источники дописаны'
