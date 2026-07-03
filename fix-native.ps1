$base = "c:\Programas\AuditoriaInventario\node_modules\.pnpm"

$junctions = @(
  @{
    dst = "$base\rollup@4.62.2\node_modules\@rollup\rollup-win32-x64-msvc"
    src = "$base\@rollup+rollup-win32-x64-msvc@4.62.2\node_modules\@rollup\rollup-win32-x64-msvc"
  },
  @{
    dst = "$base\lightningcss@1.32.0\node_modules\lightningcss-win32-x64-msvc"
    src = "$base\lightningcss-win32-x64-msvc@1.32.0\node_modules\lightningcss-win32-x64-msvc"
  },
  @{
    dst = "$base\esbuild@0.27.3\node_modules\@esbuild\win32-x64"
    src = "$base\@esbuild+win32-x64@0.27.3\node_modules\@esbuild\win32-x64"
  },
  @{
    dst = "$base\@tailwindcss+oxide@4.3.1\node_modules\@tailwindcss\oxide-win32-x64-msvc"
    src = "$base\@tailwindcss+oxide-win32-x64-msvc@4.3.2\node_modules\@tailwindcss\oxide-win32-x64-msvc"
  }
)

foreach ($j in $junctions) {
  if (!(Test-Path $j.dst)) {
    if (Test-Path $j.src) {
      New-Item -ItemType Junction -Path $j.dst -Target $j.src | Out-Null
      Write-Host "Created: $($j.dst)"
    } else {
      Write-Host "Source not found: $($j.src)"
    }
  } else {
    Write-Host "Already exists: $($j.dst)"
  }
}
