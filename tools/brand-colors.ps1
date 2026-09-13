# Разбор палитры фотографий: ищем насыщенные цвета — они и есть брендовые
# (вывеска, стаканы, элементы интерьера), а не серый фон.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null

function Analyze($path, $label) {
  $img = [System.Drawing.Image]::FromFile($path)
  $w = $img.Width; $h = $img.Height
  $bmp = New-Object System.Drawing.Bitmap $img
  $hues = @{}
  $all = @{}
  for ($y = 0; $y -lt $h; $y += 2) {
    for ($x = 0; $x -lt $w; $x += 2) {
      $c = $bmp.GetPixel($x, $y)
      $r = [int]$c.R; $g = [int]$c.G; $b = [int]$c.B
      $key = "{0},{1},{2}" -f ([int]($r / 48) * 48), ([int]($g / 48) * 48), ([int]($b / 48) * 48)
      if ($all.ContainsKey($key)) { $all[$key]++ } else { $all[$key] = 1 }

      $max = [Math]::Max($r, [Math]::Max($g, $b))
      $min = [Math]::Min($r, [Math]::Min($g, $b))
      $v = $max / 255.0
      $s = if ($max -eq 0) { 0 } else { ($max - $min) / [double]$max }
      if ($s -ge 0.35 -and $v -ge 0.22) {
        $hue = 0.0
        $d = $max - $min
        if ($d -ne 0) {
          if ($max -eq $r) { $hue = 60 * ((($g - $b) / [double]$d) % 6) }
          elseif ($max -eq $g) { $hue = 60 * ((($b - $r) / [double]$d) + 2) }
          else { $hue = 60 * ((($r - $g) / [double]$d) + 4) }
        }
        if ($hue -lt 0) { $hue += 360 }
        $bucket = [int]($hue / 30) * 30
        if (-not $hues.ContainsKey($bucket)) { $hues[$bucket] = @{ n = 0; r = 0.0; g = 0.0; b = 0.0 } }
        $e = $hues[$bucket]
        $e.n++; $e.r += $r; $e.g += $g; $e.b += $b
      }
    }
  }
  Write-Output ("=== " + $label + " (" + $w + "x" + $h + ") ===")
  Write-Output "  -- общие цвета --"
  $allTotal = ($all.Values | Measure-Object -Sum).Sum
  $all.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 6 | ForEach-Object {
    $p = $_.Key -split ','
    $hex = "#{0:X2}{1:X2}{2:X2}" -f [int]$p[0], [int]$p[1], [int]$p[2]
    Write-Output ("     " + $hex + "   " + [math]::Round(100 * $_.Value / $allTotal, 1) + "%")
  }
  Write-Output "  -- насыщенные цвета (потенциальный бренд) --"
  $satTotal = ($hues.Values | ForEach-Object { $_.n } | Measure-Object -Sum).Sum
  if ($satTotal -gt 0) {
    $hues.GetEnumerator() | Sort-Object { $_.Value.n } -Descending | Select-Object -First 6 | ForEach-Object {
      $e = $_.Value
      $hex = "#{0:X2}{1:X2}{2:X2}" -f [int]($e.r / $e.n), [int]($e.g / $e.n), [int]($e.b / $e.n)
      Write-Output ("     " + $hex + "   " + [math]::Round(100 * $e.n / $satTotal, 1) + "%  (оттенок " + $_.Key + "°)")
    }
  } else { Write-Output "     насыщенных пикселей нет" }
  $bmp.Dispose(); $img.Dispose()
  Write-Output ""
}

$dir = $args[0]
if (-not $dir) { $dir = "." }
Get-ChildItem -Path $dir -Include *.jpg, *.png -Recurse | Sort-Object Name | ForEach-Object { Analyze $_.FullName $_.Name }
