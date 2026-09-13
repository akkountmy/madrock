# Приведение всех фото к одному кадру.
#
# В карточке товара рамка 4:3, поэтому вертикальные снимки (панини 1280×2276,
# сироп 1920×2560 и другие) обрезались в узкую полоску и выглядели крупнее
# соседей. Скрипт кропит каждое фото по центру до 4:3, приводит к единому
# размеру 1200×900 и сохраняет JPEG — одинаковый кадр у всех позиций.
#
# Оригиналы складываются в assets/_original.
# Запуск: powershell -ExecutionPolicy Bypass -File tools/normalize-photos.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'assets'
$backup = Join-Path $dir '_original'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$targetW = 1200
$targetH = 900
$quality = 85

# кодировщик JPEG с заданным качеством
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), $quality

function Save-Jpeg($bitmap, $path) {
  $bitmap.Save($path, $codec, $params)
}

$files = Get-ChildItem -Path $dir -File | Where-Object { $_.Extension -match '^\.(jpg|jpeg|png)$' }
$done = 0
$skipped = 0

foreach ($f in $files) {
  if ($f.Name -like '_*') { continue }
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  $w = $img.Width; $h = $img.Height

  # уже ровно нужный кадр — не трогаем
  if ($w -eq $targetW -and $h -eq $targetH) { $skipped++; $img.Dispose(); continue }

  # центральный кроп до соотношения 4:3
  $targetRatio = $targetW / $targetH
  $srcRatio = $w / $h
  if ($srcRatio -gt $targetRatio) {
    $cropH = $h
    $cropW = [int]($h * $targetRatio)
  } else {
    $cropW = $w
    $cropH = [int]($w / $targetRatio)
  }
  $cropX = [int](($w - $cropW) / 2)
  $cropY = [int](($h - $cropH) / 2)

  $srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $targetW, $targetH
  $out = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(20, 16, 14))
  $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $img.Dispose()

  # оригинал — в архив, рядом кладём выровненный jpeg
  $orig = Join-Path $backup ($f.BaseName + $f.Extension)
  if (-not (Test-Path $orig)) { Copy-Item $f.FullName $orig }
  $target = Join-Path $dir ($f.BaseName + '.jpg')
  if (Test-Path $target) { Remove-Item $target -Force }
  Save-Jpeg $out $target
  $out.Dispose()
  if ($f.Extension -ne '.jpg') { Remove-Item $f.FullName -Force }

  $done++
  Write-Output ("  " + $f.Name.PadRight(18) + $w + "x" + $h + " -> " + $targetW + "x" + $targetH)
}

Write-Output ""
Write-Output ("выровнено: " + $done + " · уже были в нужном кадре: " + $skipped)
Write-Output ("оригиналы: assets\_original")
