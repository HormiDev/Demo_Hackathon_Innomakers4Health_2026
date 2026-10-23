# Interpretación y límites clínicos

[Volver al README](../README.md)

Deriva es una demostración de apoyo a la derivación. No diagnostica enfermedades, prescribe tratamientos, reserva consultas ni sustituye al profesional. No se ha entrenado ni calibrado con datos del hospital. La decisión final, incluyendo la pertinencia de una especialidad para un menor, requiere revisión médica.

## Porcentajes

Se muestran las probabilidades de las opciones que devuelve Tev, identificadas como puntuaciones del modelo. No son probabilidades de enfermedad ni estimaciones validadas de corrección clínica. Cambiar el catálogo, las descripciones o el contexto puede cambiar la distribución. Un máximo elevado no demuestra que la recomendación sea correcta. «Sin orientación concluyente» es una alternativa explícita del catálogo, no una medida clínica validada de incertidumbre.

## Señales de alarma ilustrativas

El formulario pregunta por dificultad respiratoria intensa, opresión intensa en el pecho, pérdida de conocimiento o alteración repentina de respuesta, cambios marcados de coloración y esfuerzo respiratorio en menores. Si alguna se declara afirmativamente, las reglas devuelven una indicación de valoración inmediata antes de llamar a Tev y sin porcentajes.

Estas señales se apoyan de forma ilustrativa en la [información del NHS sobre dificultad respiratoria en adultos y menores](https://www.nhs.uk/symptoms/shortness-of-breath/). Su formulación y combinación necesitan revisión y adaptación por profesionales del hospital. No constituyen un protocolo de triaje exhaustivo ni establecen un nivel de prioridad asistencial validado.

Una respuesta «ninguna» o un resultado aparentemente tranquilizador no descartan urgencia. Una respuesta «no sé» exige comprobación profesional. Los síntomas libres y los historiales no se someten a una detección determinista exhaustiva de alarmas: no debe esperarse al modelo ante preocupación clínica.

## Pediatría y validación pendiente

Se adapta el formulario a menores y lactantes y se incluye Pediatría. No se codifican dosis, umbrales de constantes vitales ni protocolos clínicos por edad. La disponibilidad real de subespecialidades pediátricas no se conoce.

Antes de un uso asistencial se necesitarían catálogo y protocolos revisados por el centro, evaluación retrospectiva y prospectiva con supervisión, análisis por edades y subgrupos, calibración de puntuaciones, revisión de sesgos, estudio de fallos y seguridad, y cumplimiento de requisitos aplicables. Los marcos de evaluación como el [Evidence Standards Framework de NICE](https://www.nice.org.uk/corporate/ecd7/chapter/how-to-meet-the-standards) distinguen demostrar funcionamiento de demostrar eficacia clínica; las pruebas de esta demo solo cubren lo primero.
