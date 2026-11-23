const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const proyecto = path.resolve(process.argv[2] || process.cwd());
const ts = require(path.join(proyecto, 'node_modules/typescript'));
const testlib = fs.mkdtempSync(path.join(os.tmpdir(), 'kuatiapost-nr-prueba-'));
fs.mkdirSync(path.join(testlib,'lib/documentos'), {recursive:true});
for (const file of ['nota-remision-masiva','plantillas-documentos','catalogo-paises']) {
  const src = fs.readFileSync(path.join(proyecto,'lib/documentos',file+'.ts'),'utf8');
  const result = ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
  fs.writeFileSync(path.join(testlib,'lib/documentos',file+'.js'),result.outputText);
}

const {
  crearDatosNR, prepararNotaRemision, verificarBorradorNR,
  actualizarDatoNR, revisarCamposNR, catalogosNR
}=require(path.join(testlib,'lib/documentos/nota-remision-masiva.js'));
const cli={ iNatRec:'1', iTiOpe:'1', cPaisRec:'PRY', dNomRec:'COMERCIAL CLIENTE S.A.', dRucRec:'1234567', dDVRec:'2', dDirRec:'Av. Siempre Viva', dEmailRec:'cliente@ejemplo.com' };
const factura=(cdc,code,cantidad)=>({ archivo:`${cdc}.xml`, cdc, emisor:{ruc:'80012345',dv:'6'}, receptor:{...cli}, timbrado:{establecimiento:'001',punto:'001',numero:'0000012'}, lineas:[{indice:1,codigo:code,descripcion:'Producto para envío',unidad:'77',cantidad,precioUnitario:'45000'}]});
const x=factura('01800123456001001000001222026111610011234567','PRD1','5');
const y=factura('01800123456001001000001322026111610011234567','PRD2','7');
// No se valida firma ni aprobación aquí: facturas simuladas solo para probar mapeo del JSON.
let d=crearDatosNR('2026-11-16T14:00:00');
Object.assign(d, {
 establecimiento:'001',punto:'002',numero:'0000001', inicioTraslado:'2026-11-17',finTraslado:'2026-11-18',
 naturalezaTransportista:'1',nombreTransportista:'TRANSPORTES DE PRUEBA',rucTransportista:'80012345',dvTransportista:'6',
 nombreChofer:'Carlos López',documentoChofer:'1234567',tipoVehiculo:'Camion',marcaVehiculo:'Scania',matriculaVehiculo:'ABC123',
 salidaDireccion:'Av Principal 123',salidaDepartamento:'11',salidaDepartamentoDesc:'Central',salidaCiudad:'1',salidaCiudadDesc:'San Lorenzo',
 entregaDireccion:'Calle Falsa 45',entregaDepartamento:'11',entregaDepartamentoDesc:'Central',entregaCiudad:'2',entregaCiudadDesc:'Fernando de la Mora',
});
const casos=[];
function caso(n,fn) {try{fn();casos.push('OK '+n)}catch(e){console.error('FALLO '+n,e); process.exitCode=1}}
function construir(e=d, sel={}) {return prepararNotaRemision([x,y],x.cdc,sel,e)}
function falla(e,match){assert.throws(()=>construir(e),match)}
caso('NR válida con campos opcionales sin informar',()=>{
  const r=construir();assert.equal(r.iTiDE,'7');assert.equal(r.dNomRec,cli.dNomRec);
  assert.equal(r.dRucRec,cli.dRucRec);assert.notEqual(r.dRucRec,x.emisor.ruc);
  assert.equal(r.DocumentosAsociados.length,2);assert.equal(r.Detalles.length,2);
  assert.equal(r.dKmR,undefined);assert.equal(r.Transporte[0].dNuManif,undefined);
  assert.equal(r.Salida[0].cDisSal,undefined);assert.equal(r.Salida[0].dNumCasSal,'0');
  assert.equal(r.Transporte[0].dRucTrans,d.rucTransportista);
  assert.equal(r.Detalles[0].dPUniProSer,undefined); assert.equal(r.Subtotales,undefined);
  verificarBorradorNR(r,[x,y],x.cdc,{},d);
});
caso('99 Otro pide descripción manual real',()=>{
  falla({...d,motivo:'99'},/99.*Otro/);
  falla({...d,motivo:'99',descripcionMotivo:'Otro'},/99.*Otro/);
  falla({...d,motivo:'99',descripcionMotivo:'a'.repeat(61)},/99.*Otro/);
  const otro='Traslado de materiales a depósito temporal';
  const r=construir({...d,motivo:'99',descripcionMotivo:otro});assert.equal(r.dDesMotEmiNR,otro);
});
caso('cambio de motivo limpia motivo Otro y despacho importación',()=>{
  let s={...d,motivo:'99',descripcionMotivo:'Prueba',despachoImportacion:'1234567890123456'};
  s=actualizarDatoNR(s,'motivo','5');assert.equal(s.descripcionMotivo,'');
  s=actualizarDatoNR(s,'motivo','1');assert.equal(s.despachoImportacion,'');
  const doc=construir(s);assert.equal(doc.dDesMotEmiNR,catalogosNR.motivo['1']);
  assert.equal(doc.Transporte[0].dNuDespImp,undefined);
});
caso('importación exige despacho de 16 caracteres solo cuando corresponde',()=>{
  falla({...d,motivo:'5'},/Despacho de importación/);
  assert.equal(construir({...d,motivo:'5',despachoImportacion:'1234567890123456'}).Transporte[0].dNuDespImp,'1234567890123456');
});
caso('transportista contribuyente o no contribuyente',()=>{
  falla({...d,rucTransportista:''},/RUC del transportista/);
  let non=actualizarDatoNR(d,'naturalezaTransportista','2');
  assert.equal(non.rucTransportista,'');assert.equal(non.dvTransportista,'');
  falla(non,/Tipo de documento del transportista/);
  non.tipoIdTransportista='1';non.numeroIdTransportista='9786543';
  const r=construir(non);assert.equal(r.Transporte[0].iNatTrans,'2');
  assert.equal(r.Transporte[0].dRucTrans,undefined);assert.equal(r.Transporte[0].dDTipIDTrans,'Cédula paraguaya');
});
caso('receptor de FE no es emisor, incluso con campos adicionales',()=>{
  const r=construir({...d,clienteDireccion:'Dirección nueva cliente'});
  assert.equal(r.dDirRec,'Dirección nueva cliente');assert.equal(r.dNomRec,cli.dNomRec);
  assert.equal(r.dDVRec,cli.dDVRec);
  assert.throws(()=>verificarBorradorNR({...r,dNomRec:'Empresa emisora'},[x,y],x.cdc,{},d),/cliente/);
});
caso('distrito opcional vacío es válido, si se informa exige descripción',()=>{
  assert.equal(revisarCamposNR(d,x).length,0);
  falla({...d,salidaDistrito:'1'},/Distrito.*salida/);
  const r=construir({...d,salidaDistrito:'1',salidaDistritoDesc:'Distrito prueba'});
  assert.equal(r.Salida[0].dDesDisSal,'Distrito prueba');
});
caso('modalidad aérea solicita vuelo y lo quita al cambiar',()=>{
  falla({...d,modalidad:'3'},/Número de vuelo/);
  const conVuelo= {...d,modalidad:'3',vuelo:'PY1234'};
  assert.equal(construir(conVuelo).Transporte[0].dNroVuelo,'PY1234');
  const sinVuelo=actualizarDatoNR(conVuelo,'modalidad','1');assert.equal(sinVuelo.vuelo,'');
});
caso('cliente distinto y motivo interno no permitido se detectan',()=>{
  falla({...d,motivo:'7'},/Traslado entre locales/);
  const otra={...y,receptor:{...y.receptor,dNomRec:'OTRO CLIENTE'}};
  assert.throws(()=>prepararNotaRemision([x,otra],x.cdc,{},d),/Cliente distinto/);
});
caso('cambios manuales de cantidad no deben exceder factura y bloquear precios',()=>{
  const key=`${x.cdc}:1`;
  const r=construir(d,{[key]:{activo:true,cantidad:'3'}});
  assert.equal(r.Detalles[0].dCantProSer,'3');
  assert.throws(()=>construir(d,{[key]:{activo:true,cantidad:'9'}}),/cantidad supera/);
  r.Detalles[0].dPUniProSer='12';
  assert.throws(()=>verificarBorradorNR(r,[x,y],x.cdc,{[key]:{activo:true,cantidad:'3'}},d),/no incluye importes/);
});
caso('grupo transportista condicional para terrestre y número vehicular',()=>{
  const sin = {...d,modalidad:'1',tipoIdentificacionVehiculo:'1',identificacionVehiculo:'VIN012345',matriculaVehiculo:'',
    naturalezaTransportista:'',nombreTransportista:'',rucTransportista:'',dvTransportista:'', nombreChofer:'',documentoChofer:''};
  const r=construir(sin);assert.equal(r.Transporte[0].iNatTrans,undefined);
  assert.equal(r.Transporte[0].dNroIDVeh,'VIN012345');
  falla({...sin,modalidad:'2'},/Naturaleza del transportista/);
});
caso('fecha inválida real y campos adicionales opcionales',()=>{
  falla({...d,fecha:'2026-02-30T14:00:00'},/Fecha de emisión/);
  falla({...d,fecha:'2026-12-31T25:00:00'},/Fecha de emisión/);
  const result=construir({...d,nacionalidadTransportista:'PRY',descripcionNacionalidad:'Paraguay',
    agenteNombre:'Agencia de prueba',agenteRuc:'80012345',agenteDV:'6',agenteDireccion:'Calle Transporte Nro 120',datosVehiculo:'Uso de prueba'});
  assert.equal(result.Transporte[0].cNacTrans,'PRY');assert.equal(result.Transporte[0].dNombAg,'Agencia de prueba');
  falla({...d,nacionalidadTransportista:'PRY'},/Nacionalidad/);
  falla({...d,agenteRuc:'80012345'},/Agente|DV del agente/);
  falla({...d,agenteNombre:'Agencia de prueba',agenteRuc:'80012345',agenteDV:'6'},/Dirección del agente/);
});
caso('grupo transporte reordenado mantiene validación, valores editados no',()=>{
  const r=construir();const t=r.Transporte[0];r.Transporte[0]=Object.fromEntries(Object.entries(t).reverse());
  verificarBorradorNR(r,[x,y],x.cdc,{},d);
  r.Transporte[0].dNomTrans='No corresponde';
  assert.throws(()=>verificarBorradorNR(r,[x,y],x.cdc,{},d),/Cambió Transporte/);
});
console.log(casos.join('\n')); console.log(`${casos.length} casos comprobados`);
fs.rmSync(testlib,{recursive:true,force:true});
