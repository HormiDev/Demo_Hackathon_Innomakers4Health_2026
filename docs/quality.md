# Auditoría de decisiones y resultados

[Volver al README](../README.md)

Realizada el **24 de octubre de 2026** con `tev1:4b` y catálogo `1.3.1`. Todos los casos son ficticios. Esta auditoría comprueba el funcionamiento de la demo; no establece precisión diagnóstica, calibración ni adecuación clínica de una derivación.

## Cobertura y resultados

- 105 pruebas de backend, 14 unitarias de frontend y 28 recorridos de navegador superados; cuatro omisiones previstas de escritorio en el proyecto móvil.
- 17 escenarios completos ejecutados dos veces con Tev real: **34 recorridos, sin fallos técnicos**. Resultado: 24 clasificados, seis no concluyentes y cuatro urgentes por reglas.
- Cinco variantes de un mismo caso cambiando exclusivamente el género declarado: una misma entrada clínica y las mismas puntuaciones tras la corrección.
- Barrido adicional de 3.040 combinaciones de edad, género y punto anatómico: ninguna pregunta ofrecida fue rechazada al responder No sé. Esta comprobación es estructural, no una evaluación de Tev.

Se comprueba el límite de preguntas, que no se repitan, que pertenezcan al catálogo y a las candidatas declaradas, que se descarten preguntas ajenas a puntos precisados, que las alarmas tengan prioridad y que los mínimos pediátricos se recojan primero. La clasificación exige revisión y conserva el caso, los 23 destinos, valores finitos y ordenados, suma válida y avisos cuando procede. No se normalizan ni sustituyen probabilidades.

## Muestra observada con el modelo real

| Caso ficticio | Preguntas en cada ejecución | Estado | Primera opción observada |
| --- | --- | --- | --- |
| `talon_completo` | 0/0 | classified | Podología |
| `muneca_poco_contexto` | 6/6 | classified | Traumatología |
| `indice_bloqueo` | 1/1 | classified | Traumatología |
| `ojo_izquierdo` | 2/2 | classified | Oftalmología |
| `oido_izquierdo` | 0/0 | classified | Otorrinolaringología |
| `rodilla` | 1/1 | classified | Traumatología |
| `urinario_mujer` | 0/0 | classified | Urología |
| `urinario_hombre` | 1/1 | classified | Urología |
| `testicular_genero_mujer` | 1/1 | classified | Urología |
| `menstrual_genero_hombre` | 1/1 | classified | Ginecología y Obstetricia |
| `inespecifico` | 0/0 | inconclusive | Sin orientación concluyente |
| `pediatrico` | 4/4 | inconclusive | Neumología / Pediatría |
| `lactante` | 3/3 | classified | Pediatría |
| `alarma_adulto` | 0/0 | urgent | Sin porcentajes |
| `alarma_menor` | 0/0 | urgent | Sin porcentajes |
| `alarmas_desconocidas` | 0/0 | inconclusive | Sin orientación concluyente |
| `dos_zonas` | 1/1 | classified | Oftalmología |

Las primeras opciones se registran para inspección, no son etiquetas clínicas esperadas. Las sondas de afinidad temática de las fichas se revisan aparte de los fallos técnicos: ninguna quedó fuera de los tres primeros destinos de referencia en esta ejecución. Los casos de varias zonas pueden requerir más de una valoración, aunque esta demo ordene destinos en una lista conjunta.

## Corrección aplicada

La comparación de síntomas menstruales idénticos cambiando solo `gender` dio Ginecología como primera opción con `female` y Digestivo con `male`. Añadir una instrucción para priorizar síntomas no eliminó esa sensibilidad en la prueba exploratoria. Por ello, `gender` deja de enviarse en la petición que puntúa destinos; el resto de datos clínicos permanece intacto. Se conserva para adaptar el formulario, las preguntas y el informe. La API publica `model_input_exclusions` y el desplegable de datos del resultado lo explica.

Tras el cambio, las cinco variantes devolvieron la misma distribución: Ginecología encabezó la lista con una puntuación del modelo del 92,13 %. Ese porcentaje es una observación técnica, no una probabilidad clínica validada. No se fijó la especialidad ganadora ni se modificó ningún porcentaje.

## Variabilidad y límites observados

- Muñeca: cambió el orden de dos preguntas, manteniendo seis respuestas y Traumatología como primera opción; su puntuación varió aproximadamente de 75,68 % a 78,05 %.
- Menor con tos: la primera opción alternó entre Neumología y Pediatría con puntuaciones cercanas. Ambas ejecuciones quedaron como no concluyentes, con los 23 porcentajes visibles.
- El caso de talón suficientemente descrito terminó sin preguntas adicionales. El contexto escaso de muñeca produjo preguntas. Se conserva `enough` sin cuotas mínimas discrecionales.
- El banco estructurado y el modelo no constituyen un protocolo exhaustivo de triaje. El texto libre puede interpretarse de manera imperfecta; no se ha validado ausencia de sesgos, rendimiento clínico ni seguridad ante todos los textos adversariales.

La documentación de [Tev en Ollama](https://ollama.com/library/tev1) distingue concentración de puntuaciones de probabilidad de acertar e identifica el modelo como experimental. Los ejemplos temáticos tienen como referencia ilustrativa información del NHS sobre [áreas de dolor de mano](https://www.nhs.uk/symptoms/hand-pain/) y [dolor pélvico](https://www.nhs.uk/symptoms/pelvic-pain/); no aportan etiquetas de derivación validadas para estas fichas.

## Repetición

Con la aplicación actualizada en ejecución:

```sh
make test-quality
```

O desde el anfitrión, usando solo la biblioteca estándar de Python:

```sh
python3 scripts/quality_check.py --repeat 2 --output artifacts/quality.json
```

`--base-url` permite apuntar a otra instancia y `--repeat` admite de una a cinco repeticiones. El programa termina con código distinto de cero ante fallos técnicos; las observaciones cualitativas se publican aparte. Puede tardar más si Ollama necesita cargar el modelo.

Las fichas y respuestas están en [quality_cases.json](../examples/quality_cases.json). El resumen conservado de esta ejecución está en [quality-results.json](quality-results.json). El informe completo de la ejecución local está en `artifacts/quality-final.json`, excluido de Git; puede regenerarse con el comando anterior.
