const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");

require.extensions[".ts"] = (modulo, archivo) => {
  const fuente = fs.readFileSync(archivo, "utf8");
  const resultado = ts.transpileModule(fuente, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
  });
  modulo._compile(resultado.outputText, archivo);
};

const { verificarJson: verificarTexto } = require("../lib/integracion/verificar-json.ts");
const verificarJson = (documento, tipo) => verificarTexto(JSON.stringify(documento), tipo);
const { prepararJSONPegado } = require("../lib/integracion/ordenar-json.ts");
const { verificarApiEnvio } = require("../lib/integracion/solicitudes-integracion.ts");
const { crearPlantilla } = require("../lib/documentos/plantillas-documentos.ts");

const factura = {
  ...crearPlantilla("1"),
  iTiDE: 1,
  dEst: "001",
  dPunExp: "001",
  dNumDoc: "0000001",
  dFeEmiDE: "2026-11-27T12:00:00",
  iTipTra: 1,
  iTImp: 1,
  cMoneOpe: "PYG",
  iIndPres: 1,
  iNatRec: 2,
  iTiOpe: 2,
  cPaisRec: "PRY",
  iTipIDRec: 5,
  dNumIDRec: 0,
  dNomRec: "Innominado",
  iCondOpe: 1,
  Pagos: null,
  FormaPago: [{ iTiPago: 1, dMonTiPag: 100, cMoneTiPag: "PYG", dDMoneTiPag: null, fk_fac: null }],
  Detalles: [{
    dCodInt: "A", dDesProSer: "Producto", cUniMed: 77, dCantProSer: 1,
    dPUniProSer: 100, dTotBruOpeItem: 100, dTotOpeItem: 100,
    iAfecIVA: 1, dPropIVA: 100, dTasaIVA: 10, dBasGravIVA: 90.91, dLiqIVAItem: 9.09,
  }],
  Subtotales: [{
    dTotOpe: 100, dTotDesc: 0, dTotDescGlotem: 0, dTotAntItem: 0, dTotAnt: 0,
    dPorcDescTotal: 0, dDescTotal: 0, dAnticipo: 0, dRedon: 0, dTotGralOpe: 100,
    dSub10: 100, dIVA10: 9.09, dBaseGrav10: 90.91, dTotIVA: 9.09, dTBasGraIVA: 90.91,
    dComi: null, dIVAComi: null, fk_fac: null,
  }],
  DocumentosAsociados: null,
  Cuotas: null,
  iMotEmi: 0,
  pk_fac: 123,
};

const original = JSON.stringify(factura);
assert.equal(verificarJson(factura, "5").tipo.id, "1");
assert.deepEqual(verificarJson(factura).errores, []);
assert.deepEqual(verificarJson({ ...factura, dNumIDRec: "9999" }).errores, [
  '(dNumIDRec) Para un receptor innominado, cambiá "9999" por "0".',
]);

assert.deepEqual(JSON.parse(prepararJSONPegado(original).json), factura);
assert.equal(JSON.stringify(factura), original);

const incompleta = structuredClone(factura);
incompleta.FormaPago[0].dMonTiPag = null;
incompleta.dNumIDRec = null;
incompleta.Detalles.unshift(null);
incompleta.Detalles[1].dCantProSer = 0;
const errores = verificarJson(incompleta).errores.join("\n");
for (const ruta of ["FormaPago.0.dMonTiPag", "dNumIDRec", "Detalles[0]", "Detalles[1].dCantProSer"])
  assert.ok(errores.includes(ruta), errores);
assert.doesNotMatch(errores, /receptor innominado, cambiá|dDMoneTiPag|fk_fac|dComi|iMotEmi/);

const nota = verificarJson({ ...factura, iTiDE: "5", iMotEmi: null }, "1");
assert.equal(nota.tipo.id, "5");
assert.ok(nota.errores.some(mensaje => mensaje.includes("iMotEmi")));
assert.ok(nota.errores.some(mensaje => mensaje.includes("Registro asociado")));
assert.ok(!nota.errores.some(mensaje => mensaje.includes("FormaPago")));
for (const [tipo, campo] of [["4", "iNatVen"], ["6", "iMotEmi"], ["7", "iMotEmiNR"]]) {
  const revision = verificarJson({ iTiDE: tipo }, "1");
  assert.equal(revision.tipo.id, tipo);
  assert.ok(revision.errores.some(mensaje => mensaje.startsWith(`(${campo})`)));
}
assert.ok(verificarJson({ ...factura, iTiDE: 6 }).errores.some(mensaje => mensaje.includes("(iMotEmi)") && mensaje.includes("catálogo")));
assert.equal(verificarJson({ iTiDE: null }, "1").tipo.id, "1");
assert.equal(verificarJson({ iTiDE: ["1"] }, "1").errores.length, 1);

const credito = { ...factura, iCondOpe: 2, iCondCred: 1, dPlazoCre: "30 días", FormaPago: null };
assert.deepEqual(verificarJson(credito).errores, []);
assert.ok(verificarJson({ ...credito, dMonEnt: 10 }).errores.some(mensaje => mensaje.includes("entrega inicial")));
assert.ok(verificarJson({ ...credito, Cuotas: {} }).errores.some(mensaje => mensaje.includes("(Cuotas)")));

const parcial = structuredClone(factura);
Object.assign(parcial.Detalles[0], { iAfecIVA: 4, dBasExe: "no numérico" });
assert.ok(verificarJson(parcial).errores.some(mensaje => mensaje.includes("dBaseExe") || mensaje.includes("dBasExe")));
const descripcion = verificarJson({ ...factura, dDTipIDRec: "Otro" });
assert.deepEqual(descripcion.errores, []);
assert.ok(descripcion.sugerencias.some(mensaje => mensaje.includes("Innominado")));
assert.ok(verificarJson({ ...factura, iIndPres: 9 }).errores.some(mensaje => mensaje.includes("dDesIndPres")));
console.log("OK tipos, campos opcionales, relaciones, alias, filas inválidas y conservación del JSON.");

const futura = "https://test-integracion-mdware.dev.platform.futura100.com.py/api/operation";
const generica = "https://servicio.example/emision";
const fetchOriginal = globalThis.fetch;
globalThis.fetch = () => { assert.fail("Verificar una solicitud debe ser local."); };
try {
  const faltaOperacion = { ...factura, tipOpe: null };
  assert.deepEqual(verificarJson(faltaOperacion).errores, []);
  assert.deepEqual(verificarApiEnvio(generica, "POST", JSON.stringify(faltaOperacion), ""), {
    errores: [], contratoConocido: false,
  });
  const faltantes = verificarApiEnvio(futura, "POST", JSON.stringify(faltaOperacion), "");
  assert.equal(faltantes.contratoConocido, true);
  assert.deepEqual(faltantes.errores.map(error => error.split(":")[0]), ["Token de acceso", "tipOpe"]);
  assert.deepEqual(verificarApiEnvio(futura, "POST", JSON.stringify({ ...factura, tipOpe: 1 }), "token-de-prueba").errores, []);
  assert.deepEqual(verificarApiEnvio(generica, "GET", "", "").errores, []);
  assert.equal(verificarApiEnvio(generica, "POST", "[]", "").errores.length, 1);
  assert.equal(verificarApiEnvio("", "POST", "{}", "").errores.length, 1);
} finally {
  globalThis.fetch = fetchOriginal;
}
console.log("OK revisión local de API por URL y método, independiente del documento.");
