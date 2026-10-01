# KuatiaPost: documentación del programa

## Organización
- `components/envio-documentos`: pantalla principal, navegación y estado de trabajo.
- `components/documentos`: formulario con campos y reglas dependientes.
- `components/configuracion`: URLs, credenciales, JSON de autenticación editable y token.
- `components/manual`: manual interactivo y descarga autónoma.
- `lib/documentos`: plantillas, catálogos, formatos, validación, conversión y archivos.
- `lib/integracion`: solicitudes HTTP y validación de JSON/URL.
- `public/manual`: ilustraciones propias y manual HTML autónomo.

## Sesión y privacidad
Los datos de trabajo y credenciales se mantienen en memoria de la página. Navegar entre apartados no los borra. Recargar o cerrar elimina la sesión; no hay retención de 24 horas. Una página abierta puede ser vista por quien use ese equipo: cerrarla al terminar. Los servicios de integración externos pueden conservar sus propias solicitudes; esta aplicación no controla esa retención.

## Datos y validación
Los selectores explican sus códigos. Las opciones “Otro” tienen descripción cuando corresponde. Cheque solicita número y banco; tarjeta muestra sus datos. Los cambios de selector limpian dependencias incompatibles. Los campos obligatorios usan asterisco; los opcionales vacíos se omiten al preparar el envío. El JSON se puede editar libremente, con comprobación de sintaxis y estructura. Los campos adicionales del editor requieren que la integración los acepte.

La condición de receptor controla operación, identificación y país. Se permiten operaciones extranjeras en su caso correspondiente. Las cinco plantillas son independientes. Las reglas se basan en los materiales técnicos disponibles, pero no equivalen a certificación fiscal ni aseguran aceptación de cualquier API. La forma concreta de los grupos de pago debe confirmarse con el proveedor de integración.

## Archivos
JSON y TXT: objeto JSON. TXT también admite XML. Excel: encabezado y grupos editables, con una hoja de respaldo JSON que conserva estructuras y tipos. XML: importa un DE compatible o el formato de intercambio propio de KuatiaPost. No importa lotes de varios DE. La exportación XML de KuatiaPost sirve para recuperar datos y NO es un XML fiscal firmado. Los archivos se limitan a 10 MB. La exportación disponible es individual.

## Interfaz
Tema claro y oscuro en memoria. Avisos temporales por color y errores detallados persistentes hasta revisión. Respuestas y validaciones desplegables. El asistente está deshabilitado y anuncia “Próximamente habilitado en KuatiaPost”. No realiza consultas de IA.

## Recursos y licencias
Marca e ilustraciones creadas para KuatiaPost. Los iconos Lucide son de uso libre bajo licencia ISC; debe conservarse la licencia aplicable. Las dependencias tienen sus propias licencias: libre no significa sin licencia.
