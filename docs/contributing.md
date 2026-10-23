# Desarrollo y contribución

[Volver al README](../README.md)

## Organización

El catálogo clínico y sus condiciones se encuentran en el backend y se distribuyen al frontend mediante la API. Los contratos se validan con Pydantic y se reflejan en los tipos TypeScript. El estado del caso pertenece a React; no se deben añadir mecanismos de persistencia implícita.

Cada función propia, componente y prueba debe llevar un comentario breve en la línea superior que describa su propósito. Prioriza comentarios de intención, especialmente para reglas de elegibilidad, validación de probabilidades y eliminación de estado.

## Antes de entregar cambios

1. Ejecuta `make test` y `make build`.
2. Si cambias el formulario, verifica teclado, lateralidad, edades y un tamaño de pantalla móvil; ejecuta las pruebas de navegador.
3. Si cambias las peticiones, el catálogo o las dependencias del modelo, ejecuta `make test-live` con casos ficticios y actualiza la documentación correspondiente.
4. Mantén actualizado el índice del README y documenta cambios de API o configuración.

Al cambiar especialidades, revisa el límite de opciones y contexto. Al cambiar criterios o preguntas clínicas, solicita revisión profesional antes de atribuirles uso asistencial. No añadas datos identificativos a los ejemplos, archivos de prueba ni capturas.
