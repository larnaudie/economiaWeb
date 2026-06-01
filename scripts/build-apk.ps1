$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"

if (Test-Path $androidStudioJbr) {
  $env:JAVA_HOME = $androidStudioJbr
  $env:Path = "$androidStudioJbr\bin;$env:Path"
}

Write-Host "Compilando frontend Android..."
npm --prefix "$root\frontend" run android:sync

Write-Host "Generando APK debug..."
Push-Location "$root\frontend\android"
try {
  .\gradlew.bat clean assembleDebug
}
finally {
  Pop-Location
}

Write-Host "Restaurando build web para el servidor local..."
npm --prefix "$root\frontend" run build
node "$root\scripts\prepare-vercel-static.js"

$apkPath = Join-Path $root "frontend\android\app\build\outputs\apk\debug\app-debug.apk"
if (!(Test-Path $apkPath)) {
  throw "No se encontro el APK generado en $apkPath"
}

Write-Host ""
Write-Host "APK generado correctamente:"
Write-Host $apkPath
