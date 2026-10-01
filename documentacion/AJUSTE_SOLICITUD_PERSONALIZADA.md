# Solicitud personalizada y revisión

Completar campos refleja todas las propiedades del objeto JSON: cabecera, listas de ítems, objetos anidados y claves adicionales. La edición conserva las claves originales y no incorpora una plantilla distinta. Se pueden añadir o retirar ítems. El editor JSON permite añadir o eliminar propiedades. El formulario requiere un objeto raíz, como las solicitudes de integración.

Revisar presenta su resultado debajo de las acciones del editor. Comprueba sintaxis, tipos de grupos y, si existe un iTiDE reconocido, las reglas y campos obligatorios de ese tipo. La emisión tipOpe=1 requiere un iTiDE reconocido. Para solicitudes de otros contratos no se inventan campos obligatorios: la revisión explica su alcance. La presencia de gCamItem sin Detalles muestra una advertencia de compatibilidad, sin renombrar automáticamente el JSON. Editar el contenido descarta la revisión anterior.

Ordenar JSON añade sangría de dos espacios a cualquier JSON válido, incluyendo listas y valores simples. No cambia las claves, los valores ni el orden de los ítems. Conserva literalmente los números y su precisión decimal, sin reconstruirlos desde números JavaScript.

Verificación: renderizado estático de campos adicionales y grupos anidados; conservación de códigos, decimales, exponentes y números grandes al formatear; rechazo de sintaxis inválida. Compilación y TypeScript. No se enviaron solicitudes a una API real ni se completó una prueba interactiva de navegador en este entorno.
