#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || process.cwd());
const src = f => fs.readFileSync(path.join(root, f), 'utf8');
const app = src('components/envio-documentos/EnvioDocumentos.tsx');
const nr = src('components/documentos/GenerarNotaRemisionMasiva.tsx');
const css = src('app/globals.css');
const geo = src('components/documentos/SelectorGeografia.tsx');
const select = src('components/documentos/BuscadorCatalogo.tsx');
const evento = src('components/documentos/EventoCancelacion.tsx');
const eventosConsultas = src('components/documentos/EventosConsultas.tsx');
const page = src('app/page.tsx');
const tests = [
 ['Acceso directo sin formulario login', page.includes('AplicacionPrivada') && !page.includes('AccesoCuenta')],
 ['Eventos / Consultas en menú y vista', app.includes('Eventos / Consultas') && app.includes('<EventosConsultas token={token}')],
 ['Cancelación por numeración o CDC', eventosConsultas.includes('Por numeración') && eventosConsultas.includes('Por CDC')],
 ['Nota de remisión masiva integrada', app.includes('<GenerarNotaRemisionMasiva')],
 ['No aparece indicador Este navegador', !app.includes('Este navegador ·')],
 ['No aparece publicidad de guardado en lateral', !app.includes('Datos separados por navegador')],
 ['No aparece pie con guardado automático', !app.includes('Datos privados · Guardado automático')],
 ['No aparece Borrador sin emitir', !nr.includes('Borrador sin emitir')],
 ['No aparece cartel de guardado en NR', !nr.includes('Guardado automático del trabajo')],
 ['Guardado interno sigue activo', app.includes('useAutoguardadoCuenta(persistente, guardadoLocal)')],
 ['Buscador funciona por nombre/código', select.includes('Buscar por nombre o código')],
 ['Lista usa portal fuera del scroll del modal', select.includes('createPortal(') && select.includes('document.body')],
 ['CSS del buscador incluido en la aplicación', css.includes('.kp-selector-popover .kp-selector-search') && css.includes('.kp-selector-trigger')],
 ['Tema oscuro en buscador', css.includes('html[data-tema="oscuro"] .kp-selector-popover')],
 ['Opción quitar selección', select.includes('Quitar selección')],
 ['Cascada geográfica', geo.includes('distrito:"",distritoDesc:"",ciudad:"",ciudadDesc:""')],
 ['Evento con motivo Otro editable', evento.includes('form.opcion==="otro"') && evento.includes('motivoManual')],
 ['Evento con prevención de reintentos inciertos', evento.includes('["aprobado","incierto"].includes(resultado.estado)')],
 ['Campos de cliente no emisor en NR', nr.includes('gDatRec (receptor/cliente)')],
 ['NR validar antes de utilizar JSON', nr.includes('verificarBorradorNR(doc')],
];
for(const [name, check] of tests) {assert(check, name); console.log('OK', name)}
console.log('TOTAL',tests.length,'controles de integración verificados');
