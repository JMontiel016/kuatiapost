/** Prueba los códigos del Excel recibido y reglas de todos los documentos, sin servicios externos. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const raiz=path.resolve(process.argv[2]||process.cwd());
const data=require(path.join(raiz,'lib/documentos/catalogo-geografico-ine-2025.json'));
const TS=(()=>{try{return require(path.join(raiz,'node_modules/typescript'));}catch{return require('typescript');}})();
require.extensions['.ts']=(m,file)=>{const src=TS.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:TS.ModuleKind.CommonJS,target:TS.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText;m._compile(src,file);};
const geo=require(path.join(raiz,'lib/documentos/validar-geografia.ts'));
const {crearPlantilla}=require(path.join(raiz,'lib/documentos/plantillas-documentos.ts'));
const { revisarDescripciones, completarDescripciones, validarDocumento } = require(path.join(raiz, 'lib/documentos/campos-documentos.ts'));
const { ordenarJSON, prepararJSONPegado } = require(path.join(raiz, 'lib/integracion/ordenar-json.ts'));
const { parseObject, quitarComentariosJSON, request, revisarTextoJSON } = require(path.join(raiz, 'lib/integracion/solicitudes-integracion.ts'));
let total=0;
async function ok(nombre,f){await f();console.log('OK',nombre);total++;}
async function falla(nombre,f,contiene){await assert.rejects(f,error=>error.message.includes(contiene));console.log('OK',nombre);total++;}
const dis=new Map(data.distritos.map(([c,d,n])=>[c,{d,n}]));
const ciudad=new Map(data.ciudades.map(([c,d,n])=>[c,{d,n}]));
const lugar=(dep,dis,c)=>({departamento:String(dep),distrito:String(dis),ciudad:String(c)});
(async()=>{
 await ok('Ordenar JSON conserva comentarios, decimales, claves y orden', async () => {
   const texto = '{"z":6425.0900, // tasa del día\n"a":"https://ejemplo.test/a//b","lista":[9007199254740999,1e-03]}';
   const ordenado = ordenarJSON(texto);
   assert.match(ordenado, /^\{\n    "z": 6425\.0900, \/\/ tasa del día\n    "a":/);
   assert.match(ordenado, /9007199254740999/);
   assert.match(ordenado, /1e-03/);
   assert.equal(ordenarJSON(ordenado), ordenado);
   assert.equal(parseObject(ordenado).a, 'https://ejemplo.test/a//b');
   assert.deepEqual(parseObject('// nota\n{"a":1} // fin'), { a: 1 });
   assert.throws(() => ordenarJSON('{"a":1, // comentario\n}'));
   assert.match(prepararJSONPegado(texto + '\n[2026-11-24] app.ERROR: falla').registro, /app.ERROR/);
   const fetchOriginal = global.fetch;
   try {
     global.fetch = async (_url, opciones) => {
       assert.equal(opciones.body, quitarComentariosJSON(ordenado));
       assert.match(opciones.body, /6425\.0900/);
       assert.doesNotMatch(opciones.body, /tasa del día/);
       assert.deepEqual(JSON.parse(opciones.body), parseObject(ordenado));
       return new Response('{}');
     };
     await request('https://ejemplo.test', 'POST', parseObject(ordenado), '', ordenado);
   } finally {
     global.fetch = fetchOriginal;
   }
 });
 await ok('Revisar detecta campos en blanco, tipo, precisión, caracteres y claves duplicadas', () => {
   const texto = String.raw`{
     // comentario válido
     "tipOpe": "1",
     "iTiDE": "1",
     "dEst": "  ",
     "dPunExp": { "valor": "001" },
     "dNumDoc": "12345678",
     "dFeEmiDE": "2026-11-24T24:00:00",
     "dNomRec": "Cliente\u0001",
     "personalizado": ["texto\uFFFD", "\uD800", "Paraguay 🇵🇾"],
     "Detalles": [{ "dCantProSer": 1.000000000, "dCodInt": "a", "dCodInt": "b" }]
   }`;
   const doc = parseObject(texto);
   const textoRevisado = revisarTextoJSON(texto);
   const errores = validarDocumento(doc, '1', textoRevisado.numeros);
   assert.ok(errores.some(e => /dEst.*falta completar/.test(e)));
   assert.ok(errores.some(e => /dPunExp.*Debe contener texto o un número/.test(e)));
   assert.ok(errores.some(e => /dNumDoc.*7/.test(e)));
   assert.ok(errores.some(e => /dFeEmiDE.*AAAA/.test(e)));
   assert.ok(errores.some(e => /Detalles\[0\]\.dCantProSer.*8 decimales/.test(e)));
   assert.ok(textoRevisado.errores.some(e => /dNomRec.*no válido para XML/.test(e)));
   assert.ok(textoRevisado.errores.some(e => /personalizado\[0\].*reemplazo/.test(e)));
   assert.ok(textoRevisado.errores.some(e => /personalizado\[1\].*no válido para XML/.test(e)));
   assert.ok(!textoRevisado.errores.some(e => /personalizado\[2\]/.test(e)));
   assert.ok(textoRevisado.errores.some(e => /Detalles\[0\]\.dCodInt.*Clave repetida.*línea/.test(e)));
   assert.throws(() => parseObject('{"a": 1,\n "b": }'), /línea 2, columna/);
 });
 await ok('verificación completa combina catálogo y diagnósticos del texto original', () => {
   const texto = '{"iTiDE":1,"tipOpe":1,"dEst":"01","campoSoloDeMiApi":true,\n"Detalles":[{"dCantProSer":1.000000000,"dCodInt":"A","dCodInt":"B"}]}';
   const informe = prepararJSONPegado(texto, '1');
   assert.ok(informe.mensajes.some(e => /campoSoloDeMiApi.*campo no reconocido/.test(e)));
   assert.ok(informe.mensajes.some(e => /dEst.*3 caracteres/.test(e)));
   assert.ok(informe.mensajes.some(e => /dCantProSer.*9 decimales/.test(e)));
   assert.ok(informe.mensajes.some(e => /dCodInt.*Clave repetida/.test(e)));
 });
 await ok('revisa todas las filas aunque otra sea inválida y usa el tipo declarado', () => {
   const doc = { iTiDE: 1, tipOpe: 1, iTImp: 1, dEst: '01',
     Detalles: [null, { dCantProSer: 0 }],
     Subtotales: [{ dSubExe: '0.1', dSubExo: '0.2', dSub5: '0', dSub10: '0', dTotOpe: '0.31', dIVAComi: '0.000000001' }],
     anidado: { segunda: { dNumDoc: '01' } },
   };
   const informe = prepararJSONPegado(JSON.stringify(doc), '7');
   assert.equal(informe.tipo, '1');
   assert.equal(informe.resumen.filas, 3);
   assert.ok(informe.avisos.some(e => /declara iTiDE=1/.test(e)));
   assert.ok(informe.errores.some(e => /Detalles\[0\].*objeto/.test(e)));
   assert.ok(informe.errores.some(e => /Detalles\[1\].*mayor que cero/.test(e)));
   assert.ok(informe.errores.some(e => /dEst.*3 caracteres/.test(e)));
   assert.ok(informe.errores.some(e => /dIVAComi.*Recibido: 1 dígitos enteros y 9 decimales/.test(e)));
   assert.ok(informe.errores.some(e => /dTotOpe.*la suma de los cuatro subtotales da 0\.3/.test(e)));
   assert.ok(informe.errores.some(e => /anidado\.segunda\.dNumDoc.*7 caracteres/.test(e)));
   assert.ok(!informe.avisos.some(e => e.includes('dIVAComi')));
   assert.ok(!informe.mensajes.some(e => /manual|sifen|marangatu|referencia:|\bNT \d/i.test(e)));
 });
 await ok('descripción deducible no bloquea y se puede aplicar por fila', () => {
   const doc = { iTiDE: 1, iCondOpe: 1, Pagos: [{ iTiPago: 1 }, { iTiPago: '5', dDesTiPag: 'Transferencia' }] };
   const revision = revisarDescripciones(doc, '1');
   assert.deepEqual(revision.errores, []);
   assert.ok(revision.sugerencias.some(p => p.campo === 'dDCondOpe' && p.valor === 'Contado'));
   assert.ok(!validarDocumento(doc, '1').some(error => /dDCondOpe|dDesTiPag/.test(error)));
   const completo = completarDescripciones(doc, '1');
   assert.equal(completo.dDCondOpe, 'Contado');
   assert.equal(completo.Pagos[0].dDesTiPag, 'Efectivo');
   assert.equal(completo.Pagos[1].dDesTiPag, 'Transferencia');
   assert.equal(doc.dDCondOpe, undefined);
   assert.equal(doc.Pagos[0].dDesTiPag, undefined);
   const alternativo = { iTiDE: 1, iCondOpe: 1, FormaPago: [{ iTiPago: 1 }] };
   assert.ok(!validarDocumento(alternativo, '1').some(error => /al menos una forma de pago|dDesTiPag/.test(error)));
   const completado = completarDescripciones(alternativo, '1');
   assert.equal(completado.FormaPago[0].dDesTiPag, 'Efectivo');
   assert.ok(!('Pagos' in completado));
 });
 await ok('la descripción contradictoria se sugiere, los códigos ausentes y Otro siguen siendo errores', () => {
   const doc = { iCondOpe: 2, dDCondOpe: 'Contado', dMonEnt: 10, Pagos: [{ iTiPago: 99 }, { dDesTiPag: 'Efectivo' }] };
   const { errores, sugerencias } = revisarDescripciones(doc, '1');
   assert.ok(!errores.some(e => e.includes('dDCondOpe')));
   assert.ok(errores.some(e => e.includes('Pagos[0].dDesTiPag')));
   assert.ok(errores.some(e => e.includes('Pagos[1].iTiPago')));
   assert.ok(sugerencias.some(s => s.campo === 'dDCondOpe' && s.valor === 'Crédito' && s.reemplaza));
   assert.ok(validarDocumento({ iCondOpe: 2, dMonEnt: 10 }, '1').some(e => e.includes('forma de pago de la entrega inicial')));
   assert.ok(validarDocumento({ Pagos: [null] }, '1').some(e => /Pagos\[0\].*objeto/.test(e)));
 });
 await ok('presencia, país y descripción de identidad deducibles, sin cambiar tipOpe', () => {
   const doc = { iTiDE: 1, iIndPres: 2, iNatRec: 2, iTiOpe: 4, cPaisRec: 'BRA', iTipIDRec: 1, dDTipIDRec: 'RUC' };
   const errores = validarDocumento(doc, '1');
   assert.ok(errores.includes('(tipOpe) Operación: el envío de datos utiliza 1.'));
   assert.ok(!errores.some(e => /dDesPaisRe|dDTipIDRec|dDesIndPres/.test(e)));
   const completo = completarDescripciones(doc, '1');
   assert.equal(completo.dDesPaisRe, 'Brasil');
   assert.equal(completo.dDTipIDRec, 'Cédula paraguaya');
   assert.equal(completo.dDesIndPres, 'Operación electrónica');
   assert.equal(completo.tipOpe, undefined);
   assert.equal(doc.dDTipIDRec, 'RUC');
   assert.ok(revisarDescripciones({ cPaisRec: 'ZZZ' }, '1').errores.some(e => e.includes('cPaisRec')));
 });
 await ok('18 departamentos del XLSX',()=>assert.equal(data.departamentos.length,18));
 await ok('272 distritos del XLSX',()=>assert.equal(data.distritos.length,272));
 await ok('6.766 ciudades/localidades del XLSX',()=>assert.equal(data.ciudades.length,6766));
 await ok('Códigos únicos de distritos y ciudades',()=>{assert.equal(new Set(data.distritos.map(x=>x[0])).size,272);assert.equal(new Set(data.ciudades.map(x=>x[0])).size,6766);});
 await ok('Todos los distritos están en su departamento',()=>{const dep=new Set(data.departamentos.map(x=>x[0]));for(const [,d] of data.distritos)assert.ok(dep.has(d));});
 await ok('Todas las ciudades pertenecen a un distrito existente',()=>{for(const [,d] of data.ciudades)assert.ok(dis.has(d));});
 await ok('Asunción: Capital / Asunción / Asunción',()=>geo.verificarUbicacion(lugar(1,1,1),'Asunción'));
 const [c,d]=data.ciudades.find(([c,d,n])=>d===164&&n==='SAN LORENZO');
 await ok('San Lorenzo coincide con distrito 164 y departamento Central 12',()=>geo.verificarUbicacion(lugar(12,164,c),'San Lorenzo'));
 await ok('Distrito opcional si la ciudad corresponde al departamento',()=>geo.verificarUbicacion({departamento:'12',ciudad:String(c)},'Central'));
 await falla('Distrito de otro departamento se rechaza',()=>geo.verificarUbicacion(lugar(1,164,1),'Prueba'),'distrito');
 await falla('Ciudad de otro departamento se rechaza',()=>geo.verificarUbicacion(lugar(1,1,c),'Prueba'),'ciudad');
 await falla('Ciudad de otro distrito se rechaza',()=>geo.verificarUbicacion(lugar(12,161,c),'Prueba'),'ciudad');
 await falla('Departamento sin ciudad se rechaza',()=>geo.verificarUbicacion({departamento:'12'},'Prueba'),'departamento y ciudad');
 await falla('Descripción que no coincide se rechaza',()=>geo.verificarUbicacion({...lugar(12,164,c),ciudadDesc:'LUQUE'},'Prueba'),'nombre y código');
 await ok('La ubicación completamente vacía es opcional',()=>geo.verificarUbicacion({},'Opcional'));
 await ok('Cliente y receptor se validan',()=>geo.verificarGeografiaDocumento({cDepRec:'12',cDisRec:'164',cCiuRec:String(c)}));
 await ok('Vendedor (autofactura) se valida',()=>geo.verificarGeografiaDocumento({cDepVen:'12',cCiuVen:String(c)}));
 await ok('Lugar de operación se valida',()=>geo.verificarGeografiaDocumento({cDepProv:'12',cCiuProv:String(c)}));
 await ok('Salida y entrega se validan',()=>geo.verificarGeografiaDocumento({Salida:[{cDepSal:'12',cDisSal:'164',cCiuSal:String(c)}],Entrega:[{cDepEnt:'12',cCiuEnt:String(c)}]}));
 await falla('Se valida cada local de salida, incluso el segundo',()=>geo.verificarGeografiaDocumento({Salida:[{cDepSal:'12',cCiuSal:String(c)},{cDepSal:'1',cCiuSal:String(c)}]}),'Salida #2');
 await falla('Se valida cada local de entrega, incluso el segundo',()=>geo.verificarGeografiaDocumento({Entrega:[{cDepEnt:'12',cCiuEnt:String(c)},{cDepEnt:'1',cCiuEnt:String(c)}]}),'Entrega #2');
 for(const tipo of ['1','4','5','6','7']) {
  const plantilla=crearPlantilla(tipo);
  await ok(`FC/AF/NC/ND/NR ${tipo}: receptor compatible`,()=>{
    for(const clave of ['cDepRec','cDisRec','cCiuRec'])assert.ok(clave in plantilla,clave);
  });
 }
 await ok('País PRY admitido',()=>geo.verificarPais('PRY','País'));
 await ok('País ficticio bloqueado',()=>assert.throws(()=>geo.verificarPais('ZZZ','País')));
 console.log('TOTAL',total,'PRUEBAS COMPLETADAS');
})().catch(e=>{console.error(e);process.exit(1);});
