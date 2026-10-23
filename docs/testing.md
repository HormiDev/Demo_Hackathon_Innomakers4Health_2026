# Pruebas

[Volver al README](../README.md)

## Pruebas aisladas

```sh
make test
```

Las pruebas de backend utilizan `TestClient` y transportes HTTPX inyectados. Verifican contratos, privacidad de errores, distribución y orden, respuestas corruptas, falta de modelo, timeout, alarmas, edades, mínimos pediátricos, límite de ocho respuestas, dependencias y presupuesto de contexto.

Las pruebas unitarias del frontend comprueban selección exclusiva, invalidación, lectura local de archivos UTF-8 y exportación. Las respuestas numéricas de prueba existen solo en las pruebas; no hay un modo de resultados simulados en la aplicación.

Las imágenes de pruebas se ejecutan con red desactivada. Necesitan conexión solo al construir dependencias y preparar el tokenizador.

## Navegador

Con la aplicación arrancada y las dependencias de `frontend/` instaladas:

```sh
cd frontend
npx playwright install chromium
npm run test:e2e
```

Si ya hay Chrome instalado, evita descargar otro navegador:

```sh
CHROME_PATH=/opt/google/chrome/chrome npm run test:e2e
```

Los proyectos de escritorio y móvil recorren el formulario, las selecciones del mapa, revisión obligatoria, resultados, descarga, borrado y recarga. Interceptan inferencia con respuestas de prueba y consumen el catálogo real. `E2E_BASE_URL` permite cambiar el puerto o la URL local de la aplicación.

## Integración real

```sh
make up
make test-live
```

El script consume los ejemplos ficticios, responde «no sé» a las preguntas adicionales y realiza clasificaciones reales contra Tev. Verifica que no se repiten preguntas y que los 23 valores están ordenados y suman aproximadamente uno. Muestra el número de preguntas, destinos principales y latencias. No evalúa ni afirma corrección clínica.

Resultados de esta implementación: [validación realizada](validation.md).
