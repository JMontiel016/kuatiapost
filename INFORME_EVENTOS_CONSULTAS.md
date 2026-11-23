# KuatiaPost — Eventos / Consultas (unificación)

## Contenido
- Menú principal: **Eventos / Consultas**, reemplaza la navegación dividida "Consulta y KUDE" y "Cancelar documento".
- Pestañas internas: **Consultas y KUDE** / **Eventos**.
- En Eventos: **Cancelación**, **Inutilización** y **Nominación**.
- Cancelación por **numeración** o por **CDC**; inutilización por rango; nominación por CDC y datos del receptor.
- Campo **mOtEve** totalmente manual para cada evento, sin sugerencias ni autocompletado.
- JSON editable, validación previa, regreso al formulario y persistencia del último trabajo por perfil de navegador en `localStorage`.
- Diseño compacto, responsive, modo claro/oscuro; no se muestran etiquetas de guardado.

## Seguridad y alcance
Los botones **Validar y preparar** construyen y validan borradores locales. **No se ejecuta una cancelación, inutilización o nominación real** y el JSON debe revisarse contra el contrato de tu API y las reglas SIFEN vigentes antes de habilitar el envío. El módulo de cancelación antiguo se conserva como respaldo de código, pero ya no figura como una página independiente.

## Instalación
Descomprimí el ZIP, entrá a `kuatiapost-main`, ejecutá `npm ci`, `npm run typecheck`, `npm run build`, `npm run dev`.

## Comprobaciones de esta entrega
- Inspección de la estructura de la versión consolidada y comparación de la navegación con las capturas suministradas.
- Verificación de sintaxis TypeScript/TSX de los dos componentes afectados.
- No se completaron `npm ci` ni las verificaciones de compilación Next.js de esta versión dentro del entorno de preparación, por lo que las pruebas finales deben hacerse en la instalación local.
