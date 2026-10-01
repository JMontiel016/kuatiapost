# Verificación

## Comprobaciones automatizadas realizadas en el entorno de revisión
- `node verificar-mejoras.cjs`: cinco plantillas, selecciones Otro, cheque/tarjeta, país, longitudes, JSON seguro, renderizado estático de campos y recuperación Excel de valores complejos.
- `node verificar-archivos.cjs`: JSON/TXT, intercambio XML, XML DE con espacios de nombres y rechazo de entradas incompatibles. La prueba XML usa un adaptador DOM de prueba, no un navegador real.
- `node verificar-parciales.cjs`: precisión decimal, cantidades, importes parciales, códigos y rechazos de cálculos imposibles.
- `npm run build -- --webpack`: compilación de producción y comprobación TypeScript.

## Verificación pendiente con el usuario
La automatización del navegador no pudo acceder al servidor local del entorno. No se verificó una sesión real del navegador ni se enviaron solicitudes a la API del usuario. Antes de producción, probar autenticación, envío, consulta y KuDE en el ambiente de prueba de su integración, incluyendo cheque, tarjeta, receptor extranjero y todos los tipos de operación. No se garantiza ausencia absoluta de errores ni aceptación fiscal por las pruebas locales.

Los scripts de prueba mencionados pertenecen al entorno de revisión y no forman parte de la actualización. La compilación puede repetirse en su proyecto con el comando indicado.

## Manual
El HTML autónomo se generó usando los mismos textos de la pantalla integrada. Las siete ilustraciones fueron revisadas visualmente. El HTML puede imprimirse y guardarse en PDF desde el navegador.
