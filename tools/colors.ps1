$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing | Out-Null

$dir = $args[0]
Get-ChildItem -Path $dir -Filter *.jpg | Sort-Object Name | ForEach-Object {
  $img = [System.Drawing.Image]::FromFile($_.FullName)
  $w = $img.Width; $h = $img.Height
  $bmp = New-Object System.Drawing.Bitmap $img
  $counts = @{}
  for ($y = 0; $y -lt $h; $y += 3) {
    for ($x = 0; $x -lt $w; $x += 3) {
      $c = $bmp.GetPixel($x, $y)
      $key = "{0},{1},{2}" -f ([int]($c.R / 32) * 32), ([int]($c.G / 32) * 32), ([int]($c.B / 32) * 32)
      if ($counts.ContainsKey($key)) { $counts[$key]++ } else { $counts[$key] = 1 }
    }
  }
  $total = ($counts.Values | Measure-Object -Sum).Sum
  Write-Output ("=== " + $_.Name + " (" + $w + "x" + $h + ") ===")
  $counts.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 6 | ForEach-Object {
    $p = $_.Key -split ','
    $hex = "#{0:X2}{1:X2}{2:X2}" -f [int]$p[0], [int]$p[1], [int]$p[2]
    $pct = [math]::Round(100 * $_.Value / $total, 1)
    Write-Output ("  " + $hex + "  " + $pct + "%")
  }
  $bmp.Dispose(); $img.Dispose()
}
