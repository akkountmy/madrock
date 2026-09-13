$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]
function Await($WinRtTask, $ResultType) {
  $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
  $netTask = $asTask.Invoke($null, @($WinRtTask))
  $netTask.Wait(-1) | Out-Null
  $netTask.Result
}
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]

$src = $args[0]
$tmpDir = $args[1]
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage((New-Object Windows.Globalization.Language "ru"))
if (-not $engine) { $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }

function Ocr-File($p) {
  $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($p)) ([Windows.Storage.StorageFile])
  $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $res = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  return ($res.Lines | ForEach-Object { $_.Text }) -join " || "
}

$img = [System.Drawing.Image]::FromFile($src)
Write-Output ("Source: " + $img.Width + "x" + $img.Height)

# variant A: whole image at several scales
foreach ($s in @(1.5, 2, 4)) {
  $w = [int]($img.Width * $s); $h = [int]($img.Height * $s)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.DrawImage($img, 0, 0, $w, $h); $g.Dispose()
  $f = Join-Path $tmpDir ("full_$s.png"); $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose()
  Write-Output ("--- full x$s ---"); Write-Output (Ocr-File $f)
}

# variant B: middle band (where item lines / totals usually are), upscaled
foreach ($band in @(@(0.25, 0.55), @(0.45, 0.80), @(0.55, 1.0))) {
  $y0 = [int]($img.Height * $band[0]); $hgt = [int]($img.Height * ($band[1] - $band[0]))
  $rect = New-Object System.Drawing.Rectangle 0, $y0, $img.Width, $hgt
  $crect = New-Object System.Drawing.Rectangle 0, 0, $img.Width, $hgt
  $crop = New-Object System.Drawing.Bitmap $img.Width, $hgt
  $g1 = [System.Drawing.Graphics]::FromImage($crop)
  $g1.DrawImage($img, $crect, $rect, [System.Drawing.GraphicsUnit]::Pixel); $g1.Dispose()
  $s = 4
  $big = New-Object System.Drawing.Bitmap ($img.Width * $s), ($hgt * $s)
  $g2 = [System.Drawing.Graphics]::FromImage($big)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.DrawImage($crop, 0, 0, $img.Width * $s, $hgt * $s); $g2.Dispose()
  $f = Join-Path $tmpDir ("band_" + $band[0] + "_" + $band[1] + ".png")
  $big.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $big.Dispose(); $crop.Dispose()
  Write-Output ("--- band " + $band[0] + "-" + $band[1] + " x4 ---"); Write-Output (Ocr-File $f)
}
$img.Dispose()
