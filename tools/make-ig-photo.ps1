# Instagram tiles: square crop + light warm grade (kept ASCII-only: PS 5.1
# reads a BOM-less .ps1 as ANSI, so Russian comments would break the parser).
# Usage: powershell -File tools/make-ig-photo.ps1 -In <src> -Out <dst> [-Bias 0.45]

param(
  [Parameter(Mandatory = $true)][string]$In,
  [Parameter(Mandatory = $true)][string]$Out,
  [double]$Bias = 0.45
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile($In)
try {
  $side = [Math]::Min($src.Width, $src.Height)
  $x = [int](($src.Width - $side) / 2)
  $y = [int](($src.Height - $side) * $Bias)
  $srcRect = New-Object System.Drawing.Rectangle $x, $y, $side, $side

  $size = 1080
  $canvas = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

  # warm tone + a little more colour + contrast, all in one colour matrix.
  # Kept gentle on purpose: a strong warm shift turns white cups and skin pink,
  # and a heavy vignette makes the corners muddy.
  $sat = 1.06
  $lumR = 0.3086; $lumG = 0.6094; $lumB = 0.0820
  $contrast = 1.05
  $t = (1.0 - $contrast) / 2.0

  $m = New-Object System.Drawing.Imaging.ColorMatrix
  $m.Matrix00 = ((1 - $sat) * $lumR + $sat) * 1.03 * $contrast
  $m.Matrix01 = ((1 - $sat) * $lumG) * 1.03 * $contrast
  $m.Matrix02 = ((1 - $sat) * $lumB) * 1.03 * $contrast
  $m.Matrix10 = ((1 - $sat) * $lumR) * 1.00 * $contrast
  $m.Matrix11 = ((1 - $sat) * $lumG + $sat) * 1.00 * $contrast
  $m.Matrix12 = ((1 - $sat) * $lumB) * 1.00 * $contrast
  $m.Matrix20 = ((1 - $sat) * $lumR) * 0.975 * $contrast
  $m.Matrix21 = ((1 - $sat) * $lumG) * 0.975 * $contrast
  $m.Matrix22 = ((1 - $sat) * $lumB + $sat) * 0.975 * $contrast
  $m.Matrix33 = 1.0
  $m.Matrix40 = $t
  $m.Matrix41 = $t
  $m.Matrix42 = $t

  $attr = New-Object System.Drawing.Imaging.ImageAttributes
  $attr.SetColorMatrix($m)

  $dstRect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
  $g.DrawImage($src, $dstRect, $srcRect.X, $srcRect.Y, $srcRect.Width, $srcRect.Height, [System.Drawing.GraphicsUnit]::Pixel, $attr)

  # soft vignette so the tile reads as one feed
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(-300, -300, ($size + 600), ($size + 600))
  $brush = New-Object System.Drawing.Drawing2D.PathGradientBrush $path
  $brush.CenterColor = [System.Drawing.Color]::FromArgb(0, 12, 9, 7)
  $brush.SurroundColors = @([System.Drawing.Color]::FromArgb(52, 12, 9, 7))
  $g.FillRectangle($brush, 0, 0, $size, $size)
  $brush.Dispose()
  $path.Dispose()

  # JPEG quality via encoder parameters
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $enc = New-Object System.Drawing.Imaging.EncoderParameters 1
  $enc.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 88
  $canvas.Save($Out, $codec, $enc)

  $enc.Dispose()
  $g.Dispose()
  $canvas.Dispose()
  Write-Output ('ok ' + [System.IO.Path]::GetFileName($Out))
} finally {
  $src.Dispose()
}
