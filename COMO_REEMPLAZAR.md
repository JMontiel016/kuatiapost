# Reemplazar archivos

Estos archivos se aplican sobre KuatiaPost_Asistente_Ollama, dentro de kuatiapost-react. Copiá las carpetas app, components y lib a esa raíz, conservando sus nombres y reemplazando los archivos coincidentes. No reemplaces la configuración privada de Ollama. Reiniciá con npm run dev desde kuatiapost-react.

Cambios:
- Establecimiento, punto de expedición, número y fecha obligatorios y visibles en los cinco documentos.
- Plantillas por tipo: remisión sin precios ni totales de venta; presencia solo en factura; transacción en factura/autofactura; motivos y grupos específicos para cada documento.
- JSON de autenticación editable y sincronizado en ambos sentidos. Campos adicionales se conservan y se envían.
- JSON de consulta y KUDE editables; borradores separados, conservación de propiedades adicionales y sincronización con numeración.
- La emisión envía el JSON escrito sin limpiarlo automáticamente. La validación informa lo que falta.
- Los campos opcionales vacíos se omiten al completar formularios; los valores escritos y las propiedades adicionales se conservan.

Se comprobaron TypeScript, compilación y pruebas de los cinco tipos documentales. No se probó contra la integración real.
