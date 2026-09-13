# Crop the two replacement photos to the standard frame.
#
# "frappe" source was 768x1024 and "shawarma" 510x360, so scaling them to
# 1200x900 blurred them. New sources are 3168x4752 and 4032x3024. This script
# crops 4:3 with a 42% vertical bias: in a tall glass photo the subject sits
# above the centre, so a centre crop would cut the top.
#
# ASCII only: PowerShell 5.1 reads UTF-8 without BOM as ANSI and mangles it.
# Run: powershell -ExecutionPolicy Bypass -File tools\refit-crop.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null

$root = Split-Path -Parent $PSScriptRoot
$dir = Join-Path $root 'assets'
$incoming = Join-Path $dir '_incoming'
$backup = Join-Path $dir '_original'
New-Item -ItemType Directory -Force -Path $backup | Out-Null

$targetW = 1200
$targetH = 900
$bias = 0.42

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$params = New-Object System.Drawing.Imaging.EncoderParameters 1
$params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 85

foreach ($slot in @('frappe', 'shawarma')) {
  $src = Join-Path $incoming ($slot + '-source.jpg')
  if (-not (Test-Path $src)) { Write-Output ('  SKIP ' + $slot + ': no source file'); continue }

  $img = [System.Drawing.Image]::FromFile($src)
  $w = $img.Width; $h = $img.Height

  $ratio = $targetW / $targetH
  if ($w / $h -gt $ratio) {
    $cropH = $h
    $cropW = [int]($h * $ratio)
  } else {
    $cropW = $w
    $cropH = [int]($w / $ratio)
  }
  $cropX = [int](($w - $cropW) / 2)
  $cropY = [int](($h - $cropH) * $bias)
  if ($cropY -lt 0) { $cropY = 0 }
  if (($cropY + $cropH) -gt $h) { $cropY = $h - $cropH }

  $srcRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $targetW, $targetH
  $out = New-Object System.Drawing.Bitmap $targetW, $targetH, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::FromArgb(20, 16, 14))
  $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $img.Dispose()

  $target = Join-Path $dir ($slot + '.jpg')
  if (Test-Path $target) { Copy-Item $target (Join-Path $backup ($slot + '.jpg')) -Force }
  $before = 0
  if (Test-Path $target) { $before = [math]::Round((Get-Item $target).Length / 1024) }
  if (Test-Path $target) { Remove-Item $target -Force }
  $out.Save($target, $codec, $params)
  $out.Dispose()

  $after = [math]::Round((Get-Item $target).Length / 1024)
  Write-Output ('  OK ' + $slot + ': source ' + $w + 'x' + $h + ' -> crop ' + $cropW + 'x' + $cropH + ' (top offset ' + $cropY + ') -> ' + $targetW + 'x' + $targetH + ' | ' + $after + ' KB (was ' + $before + ' KB)')
}

Remove-Item $incoming -Recurse -Force -ErrorAction SilentlyContinue
Write-Output 'temporary sources removed'
