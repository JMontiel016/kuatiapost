# Cambios de KuatiaPost

Aplicar sobre la versión KuatiaPost_React.zip entregada anteriormente. No contiene el proyecto completo.

## Reemplazo manual

Copiar cada archivo a la ruta indicada. Crear los archivos nuevos: components/documentos/ConsultarDocumento.tsx, lib/documentos/formatos-campos.ts, lib/integracion/consulta-kude.ts y lib/asistente/fuentes-integracion.json. Los restantes reemplazan los archivos existentes. No modificar .env.local ni las credenciales configuradas en Vercel.

## Aplicar automáticamente

Guardar KuatiaPost_cambios.patch dentro de la carpeta kuatiapost-react. Desde esa carpeta:

```bash
patch --dry-run -p1 < KuatiaPost_cambios.patch
patch -p1 < KuatiaPost_cambios.patch
npm run dev
```

La primera orden comprueba compatibilidad. Si falla, no ejecutar la segunda; usar los archivos individuales para reemplazar. Para publicar nuevamente en Vercel, subir los cambios al repositorio conectado.

## Uso

Configuración: URL del servicio de documentos, URL de autenticación, RUC y contraseña. El token generado se agrega automáticamente a cada solicitud. Puede borrarse o sustituirse.

Consulta y KUDE: seleccionar el tipo e ingresar establecimiento (3 dígitos), punto de expedición (3 dígitos) y número (7 dígitos). Consultar estado usa tipOpe=2. Visualizar KUDE usa tipOpe=4 y admite el campo ticket="True" del ejemplo proporcionado. La documentación API v1.1 no describe ticket: confirmar soporte con la integración. El KUDE debe llegar como PDF en base64; el visor lo abre y permite descargarlo.

Productos: Añadir producto crea un registro vacío conservando los anteriores. Los campos tienen formato y longitud verificados para los códigos de las plantillas. Las claves adicionales dependen de la API. Los campos A admiten texto con números, acentos y signos válidos; no se restringen los nombres a letras. País y moneda utilizan tres letras mayúsculas.

Exentos y exonerados: los campos de IVA no se solicitan en el formulario. Se envían en cero cuando corresponden al grupo IVA, según el manual técnico E733-E736. Los opcionales no aplicables se mantienen vacíos. No se calcula IVA sobre esos productos.

Excel: Exportar sesión reúne todas las solicitudes realizadas en esta sesión. Documentos, Productos y Totales se relacionan mediante IdDocumento. El JSON extenso se divide en partes sin truncarlo. El ejemplo masivo tiene un único documento ilustrativo, no apto para emitir. No se realizan envíos masivos desde ese ejemplo.

Borradores: cambiar de pantalla o de tipo de documento conserva lo escrito. Recargar o cerrar la página termina la sesión; no se guardan datos del cliente en localStorage.

Asistente: conserva el servicio configurado por LLAMA_URL, LLAMA_MODEL y LLAMA_API_KEY. Incluye la documentación API v1.1 como fuente interna adicional. El manual no se muestra como apartado.

## Verificación

Compilación Next.js y TypeScript correctas. Comprobaciones locales: contratos de consulta, decodificación PDF, tipos y longitudes, exentos/exonerados, marcas del formulario, exportación Excel con múltiples documentos y JSON extenso. No se enviaron documentos reales ni se probó el servicio real de IA. El servicio de integración debe permitir CORS desde el dominio de KuatiaPost.

## Selectores de códigos

Los campos con códigos cerrados ofrecen selección con número y descripción: iTipTra (13 transacciones), presencia, identidad del receptor, motivo de notas, pagos, motivos y responsables de remisión, transporte, identidad del transportista y vendedor, afectación y tasa de IVA, condición comercial y tipo de cambio. Unidad de medida incluye la tabla 5 y las 30 unidades añadidas por NT 023. Solo se guarda el código en el JSON.

Pago bancario 16 solo aparece con presencia bancaria 5. Exentos y exonerados mantienen IVA cero automático. Los valores importados fuera del catálogo se muestran como no permitidos y deben corregirse. Cantidades permiten hasta 8 decimales por NT 023 (E711).

## URL por operación y notas parciales

- Direcciones independientes para token, envío, consulta y KUDE. KUDE puede compartir consulta.
- Usuario y contraseña opcionales, JSON de autenticación sincronizado al escribir.
- Botón de ojo para contraseña y token en configuración, envío y consulta.
- KUDE PDF en base64, sin ticket. JSON de consulta visible en tiempo real.
- Numeración de establecimiento y punto limitada a tres dígitos en todos los formularios.
- Vista previa XML de nota de crédito al escribir.
- Parciales conservan precio original y calculan cantidad, bases, IVA y totales con BigInt a ocho decimales. Montos no representables exactamente se rechazan. Cantidades por código se distribuyen entre líneas repetidas.
- Compilación, TypeScript y pruebas de cálculo, consulta, PDF, campos y Excel aprobadas. No se probó contra el servicio real.

## Asistente y Ollama

Conexión automática local en desarrollo, API nativa y compatible, diagnóstico de conexión y modelo, errores en español, espera ampliada, contexto reducido, secretos retirados del texto enviado al modelo. Menú de desarrollo desactivado; ayuda fija con acceso visible al plegar. Ver ASISTENTE_OLLAMA.md.
