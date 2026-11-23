# KuatiaPost unificado — LEÉ ANTES DE INSTALAR

Esta es una entrega del **proyecto completo**, no un parche.

## Instalación

```bash
cd ~/Descargas
unzip -o KuatiaPost_Completo_Optimizado.zip -d KuatiaPost_Nuevo
cd KuatiaPost_Nuevo/kuatiapost-main
npm ci
npm run typecheck
npm run build
npm run dev
```

Abrí http://localhost:3005 y recargá con Ctrl+Shift+R.

## Si ya usás KuatiaPost

**NO borres ni sobrescribas** la carpeta `data/` de tu proyecto anterior. Ahí se guardan los datos de las cuentas técnicas y los últimos trabajos de los navegadores. El ZIP **no incluye** `data/`, `.env.local`, `node_modules/` ni `.next/` por privacidad y tamaño.

Para conservar lo existente, hacé antes una copia de seguridad de tu proyecto completo. Luego integrá los archivos fuente de este ZIP en tu carpeta actual **sin borrar `data/` ni `.env.local`**. Conservá el mismo dominio/puerto para mantener la cookie de identificación de navegador.

El sistema se abre sin login. Los navegadores diferentes reciben espacios independientes; **dos personas que compartan el mismo perfil de navegador pueden ver el mismo trabajo**. Utilizá perfiles de navegador separados si compartís equipo.

## Funciones integradas

- FC, AF, NC, ND y NR mediante editor de documentos.
- Nota de crédito desde XML y Nota de remisión masiva XML/TXT, con cantidades editables y datos del receptor.
- Consulta de documento y KUDE.
- Cancelación de documento: motivo «Otro» manual, JSON editable, guardado local y prevención de reintentos ante estado incierto.
- Buscadores geográficos del catálogo offline por nombre/código, en departamento, distrito y ciudad.
- Modo claro/oscuro (botón global); sin avisos decorativos de guardado.

**IMPORTANTE**: la cancelación y la remisión generan solicitudes para tu integrador. Para emisión real la API debe generar/firmar XML fiscal y validar la respuesta SIFEN. No se verificó una cancelación o emisión fiscal real.

## Verificación local

```bash
node tests/probar_interfaz.cjs
node tests/probar_catalogo_oficial.cjs
node tests/probar_nr_condicional.cjs
node --experimental-strip-types tests/probar_cancelacion.mjs
```
