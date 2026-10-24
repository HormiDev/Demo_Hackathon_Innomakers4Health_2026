# Formulario adaptativo

[Volver al README](../README.md)

## Recorrido

1. **Paciente:** edad en años o meses, género opcional, quién responde y motivo de consulta.
2. **Molestia:** zonas, dolor, comienzo, duración y evolución.
3. **Síntomas:** sugerencias adaptadas y acceso a otros síntomas; señales de alarma estructuradas.
4. **Preguntas a medida:** reglas pediátricas y selección de Tev entre preguntas elegibles.
5. **Revisión:** edición del motivo, resumen, historial opcional y confirmación médica.
6. **Orientación:** cinco primeras opciones y «Otros» con la suma de las restantes; desplegable con el detalle completo, advertencias, impresión y descarga.

El formulario utiliza lenguaje sencillo en ambos modos; la vista médica añade la confirmación profesional. El paciente o acompañante puede entregar el mismo navegador al médico. No existe entrega entre dispositivos ni sesión compartida remota.

## Lenguaje visual de los roles

El modo paciente utiliza verdes suaves y el indicador «Consulta del paciente». El modo médico cambia a azul pizarra y muestra «Revisión clínica». El cambio afecta al fondo, la cabecera, el progreso, los botones, el historial y la confirmación; el rol también se comunica con texto e iconos. La tarjeta de relevo conecta ambos roles y destaca la acción «Continuar como médico». Una transición breve acompaña el cambio y se desactiva si se solicita movimiento reducido. Al volver al modo paciente se recupera la paleta original.

## Presentación en directo

La cabecera mantiene el nombre del modelo, su conexión y el botón para comprobarla, también en móvil. Se han retirado el bloque de bienvenida, la cabecera promocional y explicaciones repetidas. Los textos de rol, preguntas, opciones y resultados tienen mayor tamaño; se mantienen las señales de alarma y los límites de interpretación.

En escritorio se aprovecha la altura disponible, con navegación visible y desplazamiento interno cuando lo requiere el contenido. Los primeros formularios se comprueban sin desplazamiento a 1280×720, 1366×768 y 1920×1080. Revisión y resultados utilizan dos columnas; el historial opcional y los datos técnicos de la clasificación se despliegan a petición. La confirmación médica aparece junto a la acción de obtener orientación. Los casos extensos y los detalles expandidos pueden necesitar desplazamiento.

En móvil el contenido vuelve a una columna, salvo edad/género y las ilustraciones que pueden mostrarse juntas. El modelo y el rol permanecen visibles, los campos de entrada usan 16 px y no se impide el desplazamiento natural del formulario.

## Mapa corporal y dolor

El SVG incluye frente y espalda. Las letras I/D indican el lado del paciente, que cambia de posición visual al girar la figura. Los pies, manos, brazos y piernas distinguen ambos lados. Se pueden seleccionar varias regiones; la lista de botones equivale a la selección visual. Las regiones funcionan con Enter y espacio y anuncian su estado con `aria-checked`.

Al elegir «Mujer» en los datos del paciente, el mapa utiliza una silueta femenina tanto de frente como de espalda. Ambas variantes tienen contornos suaves y sombreado discreto. La vista frontal distingue mandíbula, barbilla, cara y clavículas; la posterior utiliza una cabeza redondeada sin cara, nuca, omóplatos y línea vertebral. La variante visual conserva las mismas zonas, selecciones y controles de teclado.

Las zonas seleccionadas se indican por color, sin iconos de check en la lista. El nombre aparece en una etiqueta al pasar el cursor por la silueta o enfocar una zona con el teclado; Escape permite retirarla. La lista textual sigue disponible para selección táctil y por teclado.

Al seleccionar una región se abre al lado una silueta ampliada propia de esa parte. Hay ampliaciones para las quince regiones localizables: manos, pies, brazos, piernas, cabeza, cuello, pecho, abdomen, pelvis y las dos áreas de espalda. El selector «Zona ampliada» cambia de región y permite añadir otra. Las selecciones del cuerpo completo permanecen visibles por color y en las etiquetas de zonas.

Las manos permiten precisar dedos, palma/dorso y muñeca; los pies, dedos, antepié, empeine/arco plantar, talón y tobillo. Las demás ilustraciones ofrecen divisiones adecuadas de la región, con lateralidad del paciente. Se pueden elegir varios puntos en el dibujo o mediante botones, también con teclado. Cambiar de vista conserva los puntos de la otra superficie. El detalle es opcional: una región seleccionada sin puntos sigue siendo válida.

El campo `body_details` conserva los identificadores por zona. Se incluye en revisión, impresión, descarga y datos enviados al modelo; el estado del modelo traduce los identificadores a etiquetas legibles. Desmarcar una región retira sus detalles. Cambiar la localización precisa revoca la revisión y reinicia las respuestas adaptativas. Las ilustraciones son orientativas y no añaden reglas diagnósticas.

La escala de dolor contiene once botones (0–10) y una alternativa «no sé valorarlo». El valor desconocido es `null`, distinto de cero.

## Síntomas según el contexto

El catálogo contiene 75 opciones. La lista principal cambia según las zonas y puntos de la ampliación seleccionados, la edad y, para algunas sugerencias, el comienzo y la duración. Las zonas múltiples combinan sus opciones sin duplicarlas. «General» y «No sé localizarlo» ofrecen un perfil general. Se conservan las opciones generales pertinentes, «Ninguno» y «No sé»; el resto de opciones regionales aparece en «Más síntomas y otras zonas» para mantener compacto el formulario.

Ejemplos: un pie ofrece talón, uñas, apoyo y movilidad; la cabeza ofrece visión, oído, congestión y cefalea; el pecho, tos, palpitaciones y respiración; abdomen y pelvis, síntomas digestivos, urinarios e íntimos. Los perfiles pediátricos añaden tomas, pañales, irritabilidad y actividad según edad.

Precisar una muñeca prioriza chasquidos y uso de la mano; un dedo, bloqueo, hormigueo y uñas; un talón, primeros pasos y apoyo; un tobillo, estabilidad; un ojo, lagrimeo, secreción y arenilla. Sin puntos concretos se conserva el perfil regional. Cambiar los puntos reinicia las preguntas y obliga a reconfirmar «Ninguno/No sé», pero conserva síntomas positivos declarados; los que salen de las sugerencias siguen seleccionados en la lista adicional.

El género declarado solo prioriza sugerencias íntimas: no permite inferir anatomía. Con género no especificado, no binario u otro se consideran ambas familias. Cualquier persona puede añadir manualmente síntomas íntimos de la otra familia desde la lista adicional. Cambiar el género conserva síntomas reales ya declarados y solicita confirmar de nuevo «Ninguno/No sé».

Desde la revisión de calidad `1.3.1`, el género se conserva para la adaptación y en el informe, pero se excluye de la entrada que puntúa los destinos. Así, cambiar solo ese campo no modifica el contexto clínico de clasificación. Los síntomas íntimos explícitos se mantienen. El desplegable de datos del resultado explica esta exclusión.

Cambiar la zona o el contexto temporal elimina selecciones que ya no coinciden; cambiar la edad retira las opciones que han caducado. Estos cambios reinician las respuestas adaptativas y revocan la revisión. Un síntoma de otra zona puede declararse manualmente: la API no lo rechaza por la zona ni por el género. Las señales de alarma no se filtran por la región ni el género.

Las reglas son de presentación de la demo y requieren revisión clínica. Como referencia ilustrativa se han consultado las páginas del NHS sobre [dolor de mano](https://www.nhs.uk/symptoms/hand-pain/), [dolor del pie](https://www.nhs.uk/symptoms/foot-pain/pain-in-the-bottom-of-the-foot/), [dolor pélvico](https://www.nhs.uk/symptoms/pelvic-pain/) y [síntomas de enfermedad en menores](https://www.nhs.uk/baby/health/when-to-get-urgent-medical-help-for-babies-and-children-under-5/); no constituyen una validación de estos perfiles ni de sus límites de edad.

## Motor de preguntas

Las 48 preguntas y sus condiciones se definen en `backend/questions.py`, exportadas por `backend/catalog.py`, versión `1.3.0`. Se filtran por edad, zona, puntos precisos, contexto temporal y respuestas anteriores. El género prioriza la pertinencia de algunas ramas íntimas; los síntomas explícitos pueden activarlas con cualquier género y hay una opción «No se aplica». No se deduce anatomía del género. Las preguntas generales no requieren coincidencias.

Antes de consultar a Tev, el servidor comprueba las alarmas. En menores de 216 meses exige preguntas sobre ingesta y comportamiento; por debajo de 24 meses añade tomas y pañales. Después ordena las preguntas pertinentes aún no respondidas y presenta hasta doce candidatas y la opción `enough`, dentro del contexto limitado del modelo. Prioriza síntomas explícitos, puntos concretos y ramas sustentadas en respuestas previas.

Ejemplos de dependencias: hormigueo declarado permite preguntar su patrón; bloqueo de dedo permite precisar cuándo ocurre. La muñeca no activa preguntas de movimiento de un dedo. Seleccionar un talón evita repetir dónde está la molestia del pie. Haber marcado dolor en los primeros pasos elimina las preguntas que volverían a pedir ese patrón. Las respuestas de ramas que dejan de aplicar se retiran, incluidos sus descendientes.

Tev selecciona una opción; no escribe preguntas libres ni decide sus posibles respuestas. El servidor devuelve la pregunta del catálogo, evitando cambios de formato o preguntas inventadas. Se termina cuando el modelo selecciona `enough`, no quedan candidatas o se alcanzan ocho respuestas. Alcanzar el límite genera una advertencia de suficiencia pendiente.

Cada candidata tiene un criterio en inglés que explica qué dato falta y cuándo puede ayudar a distinguir vías de derivación; no se presenta solo el enunciado. El estado incluye los puntos concretos y respuestas previas. Se indica que evite repetir incluso lo descrito en texto libre y que termine si no hay valor adicional. No hay mínimo de preguntas discrecionales, umbral de puntuación para anular `enough`, reintento automático ni pregunta de respaldo. Se conservan exclusivamente los mínimos pediátricos anteriores.

Al terminar, la revisión explica que Tev no propone más preguntas y permite desplegar las candidatas realmente consideradas en la última decisión. No muestra razonamiento interno ni confunde esas candidatas con respuestas recogidas. La interpretación de información libre depende de Tev y no garantiza ausencia de repeticiones.

La decisión `enough` indica que el modelo permite pasar a revisión, no que exista información clínicamente suficiente. Un médico puede revisar lo recogido incluso si falla la inferencia; la clasificación exige siempre mínimos válidos y las preguntas pediátricas obligatorias.

## Modificaciones y extensiones

Cambiar la edad reinicia las preguntas adicionales, para que los mínimos pediátricos tengan espacio dentro del máximo de ocho. Cambiar zona, género, comienzo o duración reinicia las preguntas adicionales. Cambiar los síntomas elimina las respuestas cuyas condiciones dejan de cumplirse. Toda edición revoca la revisión y el resultado anterior. Para repetir la adaptación, vuelve al bloque de síntomas y continúa con el caso actualizado.

Añadir preguntas requiere opciones estructuradas, condiciones explícitas, un comentario descriptivo de cualquier nueva función y pruebas de las dependencias. Añadir destinos requiere mantener una clasificación conjunta con entre 2 y 24 opciones y revisar el presupuesto de contexto.

## Presentación de resultados

Se muestran las cinco opciones con mayor puntuación y, debajo, «Otros», que suma las puntuaciones originales de los destinos restantes antes de redondear. Al expandirlo se ven todos los destinos restantes, ordenados y con su porcentaje individual y posición original. Con cinco opciones o menos no aparece «Otros». La descarga y la impresión incluyen siempre todos los destinos, aunque el desplegable esté cerrado. Los resultados no concluyentes mantienen el mismo formato y su aviso.
