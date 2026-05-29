# Economia Web - APK Android

La app Android se genera con Capacitor desde el frontend React/Vite.

## Requisitos

- Android Studio instalado.
- JDK 17 o superior, idealmente el JDK incluido con Android Studio.
- Android SDK instalado desde Android Studio.

En esta PC actualmente Gradle detecto Java 8 de 32 bits:

`C:\Program Files (x86)\Java\jre1.8.0_491`

Eso no alcanza para compilar Android moderno. Hay que configurar `JAVA_HOME`
para apuntar a JDK 17+.

## Comandos principales

Desde la raiz del proyecto:

```bash
npm --prefix frontend run android:sync
```

Esto compila React en modo Android y copia los assets a Capacitor.

Para abrir Android Studio:

```bash
npm --prefix frontend run android:open
```

Para intentar compilar APK debug desde consola:

```bash
cd frontend/android
gradlew.bat assembleDebug
```

Si compila correctamente, el APK queda en:

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

## API usada por la APK

La build Android usa:

```text
frontend/.env.android
```

Actualmente apunta a:

```text
VITE_API_URL=https://economia-web.vercel.app/v1
```

Esto es necesario porque dentro de una APK no existe el proxy local de Vite
(`/v1`). El usuario inicia sesion contra la API publicada y los datos locales
siguen guardandose en IndexedDB del WebView hasta usar Sync nube.

## Firma release

Para publicar o instalar una version release estable falta crear un keystore y
configurar la firma Android. No guardar claves reales en Git.
