/** Prueba los códigos del Excel recibido y reglas de todos los documentos, sin servicios externos. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const raiz=path.resolve(process.argv[2]||process.cwd());
const data=require(path.join(raiz,'lib/documentos/catalogo-geografico-ine-2025.json'));
const TS=(()=>{try{return require(path.join(raiz,'node_modules/typescript'));}catch{return require('typescript');}})();
require.extensions['.ts']=(m,file)=>{const src=TS.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:TS.ModuleKind.CommonJS,target:TS.ScriptTarget.ES2022,resolveJsonModule:true,esModuleInterop:true}}).outputText;m._compile(src,file);};
const geo=require(path.join(raiz,'lib/documentos/validar-geografia.ts'));
const {crearPlantilla}=require(path.join(raiz,'lib/documentos/plantillas-documentos.ts'));
let total=0;
async function ok(nombre,f){await f();console.log('OK',nombre);total++;}
async function falla(nombre,f,contiene){await assert.rejects(f,error=>error.message.includes(contiene));console.log('OK',nombre);total++;}
const dis=new Map(data.distritos.map(([c,d,n])=>[c,{d,n}]));
const ciudad=new Map(data.ciudades.map(([c,d,n])=>[c,{d,n}]));
const lugar=(dep,dis,c)=>({departamento:String(dep),distrito:String(dis),ciudad:String(c)});
(async()=>{
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
