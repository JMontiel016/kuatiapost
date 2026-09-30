# KuatiaPost — React con asistente Llama integrado

## Cambios solicitados
- Sin sección de geografía y sin manual visible o descargable en la web.
- Solo GET y POST; POST seleccionado al abrir y al cambiar documento/operación.
- El asistente llama a POST /api/asistente. URL, modelo y clave solo se configuran en el servidor.
- El manual v150 y las notas 001–027 quedan en lib/asistente/fuentes-sifen.json como fuente interna; se devuelve la explicación y referencias de página, no el manual.
- FC, NC, ND, remisión, autofactura; JSON editable, campos vacíos, Excel y NC desde XML.

## Ejecutar el código descargado (Node 22+)
1. npm install
2. cp .env.example .env.local
3. Instalar Ollama si no está instalado: https://ollama.com/download/linux
4. ollama pull llama3.2
5. Iniciar Ollama con ollama serve si el servicio no está ejecutándose.
6. npm run dev
7. Abrir http://localhost:3005

El código descargado usa React con Next.js para disponer del backend integrado. La edición del Site utiliza Vinext, compatible con las rutas del mismo proyecto. No necesita configurar Llama en cada navegador ni entregar claves a los visitantes.

## Configuración del servidor IA
LLAMA_URL=http://127.0.0.1:11434/v1/chat/completions
LLAMA_MODEL=llama3.2
LLAMA_API_KEY= (vacía con Ollama local)

Para publicar usar un servidor Llama accesible desde el servidor web, normalmente HTTPS. El Ollama de tu PC no está disponible automáticamente desde una web alojada. El asistente está implementado; necesita el servicio real corriendo para responder. No incluye un servicio de inferencia hospedado ni una clave comercial. No se probó inferencia real sin dicho servicio.

## Solicitudes y documentos
Cada usuario ingresa URL de integración, RUC, contraseña o Bearer token. Autenticación en Configuración. La API de documentos debe admitir CORS para el origen de la web. El asistente no necesita CORS contra Ollama porque la conexión sale desde el backend.

Las plantillas son una base: SIFEN define XML, y tu integración define su contrato JSON. Completar y revisar los campos y grupos según ese contrato antes de enviar. GET omite el cuerpo y usa los parámetros de la URL. POST envía JSON. La aprobación se detecta solo mediante ruta y valor exacto configurados de la respuesta fiscal; HTTP 200 no significa aprobado. KUDE abre el enlace real del cliente.

## Excel y NC
Exportar Excel proporciona hojas Cabecera (Campo/Valor) y una hoja por grupo. Importar ese mismo formato. Los códigos y decimales se guardan como texto para mantener ceros iniciales. No se admiten fórmulas. NC desde XML completa o parcial por dCodInt; el conversor usa BigInt con 8 decimales y rechaza algunos ajustes que la plantilla reducida no soporta.

## Datos y fuentes
Documentos y credenciales solo durante la sesión; recargar borra el trabajo. No hay base de datos de documentos ni localStorage. El JSON llega al servicio IA solo si se marca Incluir el JSON actual. La pregunta y los pasajes relevantes se envían al modelo. El índice interno proviene de los adjuntos del usuario: manual v150 y notas 001–027, listado DNIT verificado el 30/09/2026. Las nuevas notas requieren actualizar el índice; no hay sincronización automática. La IA explica y cita, no valida fiscalmente.

## Organización del código
Cada carpeta describe su función y cada archivo de lógica tiene comentarios y bloques separados.
- components/envio-documentos/EnvioDocumentos.tsx: coordina edición, conexión y envío.
- components/documentos/CamposDocumento.tsx: nombres, ejemplos y marcas de obligatoriedad.
- components/documentos/GenerarNotaCredito.tsx: formulario de NC desde XML.
- components/documentos/HistorialDocumentos.tsx: solicitudes de esta sesión.
- components/configuracion/ConfiguracionIntegracion.tsx: URL, token y respuesta fiscal.
- components/asistente/BurbujaAyuda.tsx: guía de campos y acceso a Llama.
- components/asistente/ConsultaLlama.tsx: preguntas y explicaciones.
- components/formularios/CampoTexto.tsx: entrada de texto reutilizable.
- lib/documentos/plantillas-documentos.ts: plantillas vacías.
- lib/documentos/campos-documentos.ts: etiquetas, ejemplos, condiciones y revisión.
- lib/documentos/convertir-xml-nota-credito.js: importes precisos de la NC.
- lib/documentos/excel-documentos.ts: importar y exportar Excel.
- lib/integracion/solicitudes-integracion.ts: solicitudes GET/POST.
- lib/asistente/asistente-llama.ts: conexión privada al modelo.
- lib/asistente/buscar-referencias.ts: recuperación de pasajes técnicos.
- lib/asistente/fuentes-sifen.json: datos de referencia internos. JSON no admite comentarios; su procedencia está documentada aquí.
- app/api/asistente/route.ts: endpoint del asistente.
- app/page.tsx y app/layout.tsx: nombres de entrada exigidos por Next.js, con comentarios de su función.

## Campos y guía de ayuda
La pantalla muestra (dEst) Establecimiento y (dPunExp) Punto de expedición, entre otras etiquetas claras. Los ejemplos son placeholders y no rellenan datos. El esquema usa reglas del manual v150 (grupos C, D, E y F) y la NT 013 para los campos presentes en la plantilla. Distingue obligatorios, condicionales, opcionales y campos que dependen del contrato de la API. Un campo desconocido no se presenta como obligatorio confirmado por SIFEN.

Los obligatorios activos muestran lo que falta. Al elegir naturaleza del receptor, moneda o condición de venta, se actualiza la guía. Los opcionales conocidos se mantienen vacíos y se pueden visualizar deshabilitados. La cabecera y las filas se revisan aunque se elimine una clave del JSON. Antes de enviar, si la limpieza de opcionales modifica los datos, se muestra el JSON corregido y se pide revisarlo antes de volver a enviar. No se convierte un vacío en cero automáticamente: hay campos obligatorios donde debe escribirse cero.

La burbuja permanente ofrece una guía LOCAL, basada en reglas, y un botón para pedir una explicación REAL a Llama. No se llama al modelo por cada tecla ni se presentan mensajes locales como generación de IA. El botón inicia la consulta del campo al servidor. La explicación real requiere que el servicio Llama esté iniciado y configurado, como se indica arriba.

La revisión NO cubre todos los grupos posibles del XML firmado. Entre otros, documentos impresos asociados, crédito, firmas, timbrado y descriptores derivados requieren adaptar el contrato JSON completo de tu integración. No se afirma que cualquier JSON pueda ser emitido fiscalmente solo por pasar estas reglas.

## Verificación
Compilación y TypeScript; pruebas de Excel ida/vuelta y cálculos NC completos/parciales realizadas. El endpoint Llama se verifica con respuestas controladas; no se realizó emisión fiscal real ni inferencia real sin configurar los servicios.
