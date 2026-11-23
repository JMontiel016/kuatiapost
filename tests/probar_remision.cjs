/* Pruebas de importación XML/TXT con facturas ficticias. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');
const { DOMParser } = require('@xmldom/xmldom');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kuatiapost-xml-'));
try {
  for (const nombre of ['nota-remision-masiva', 'plantillas-documentos', 'catalogo-paises']) {
    const archivo = path.join(__dirname, '..', 'lib', 'documentos', nombre + '.ts');
    const { outputText } = ts.transpileModule(fs.readFileSync(archivo, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    fs.writeFileSync(path.join(temp, nombre + '.js'), outputText);
  }

  const nodo = new DOMParser().parseFromString('<rDE/>', 'application/xml').documentElement;
  if (!('children' in nodo)) {
    Object.defineProperty(Object.getPrototypeOf(nodo), 'children', {
      get() { return Array.from(this.childNodes).filter(hijo => hijo.nodeType === 1); },
    });
  }
  global.DOMParser = DOMParser;

  const { analizarFactura, calcularDVCDC, compararFacturas } = require(path.join(temp, 'nota-remision-masiva.js'));
  const baseCDC = ['01', '80000000', '1', '001', '001', '0000123', '1', '20261112', '1', '123456789'].join('');
  const cdc = baseCDC + calcularDVCDC(baseCDC);
  const ejemplo = `<rDE><DE Id="${cdc}"><gTimb><iTiDE>1</iTiDE><dEst>001</dEst><dPunExp>001</dPunExp><dNumDoc>0000123</dNumDoc></gTimb><gDatGralOpe><dFeEmiDE>2026-11-12T11:00:00</dFeEmiDE><gEmis><dRucEm>80000000</dRucEm><dDVEmi>1</dDVEmi><dNomEmi>Ejemplo</dNomEmi></gEmis><gDatRec><dRucRec>80000001</dRucRec><dDVRec>2</dDVRec><dNomRec>Cliente</dNomRec><iNatRec>1</iNatRec></gDatRec></gDatGralOpe><gDtipDE><gCamItem><dCodInt>A</dCodInt><dDesProSer>Producto A</dDesProSer><cUniMed>77</cUniMed><dCantProSer>5</dCantProSer></gCamItem><gCamItem><dCodInt>B</dCodInt><dDesProSer>Producto B</dDesProSer><cUniMed>77</cUniMed><dCantProSer>10</dCantProSer></gCamItem></gDtipDE></DE></rDE>`;
  const factura = analizarFactura(ejemplo, 'factura.xml');
  assert.equal(factura.cdc, cdc);
  assert.deepEqual(factura.emisor, { ruc: '80000000', dv: '1' });
  assert.equal(factura.receptor.dRucRec, '80000001');
  assert.deepEqual(factura.lineas.map(({ codigo, cantidad }) => [codigo, cantidad]), [['A', '5'], ['B', '10']]);
  assert.deepEqual(analizarFactura(JSON.stringify({ xml: ejemplo }), 'factura.txt').lineas, factura.lineas);
  assert.throws(() => analizarFactura(ejemplo.replace('<iTiDE>1', '<iTiDE>5'), 'tipo.xml'), /iTiDE=1/);
  assert.throws(() => analizarFactura('<!DOCTYPE x>' + ejemplo, 'entidad.xml'), /DTD/);
  assert.throws(() => analizarFactura(ejemplo.replace(cdc, baseCDC + ((Number(cdc.at(-1)) + 1) % 10)), 'dv.xml'), /dígito verificador/);
  const otroReceptor = analizarFactura(ejemplo.replace('80000001', '80000002'), 'otro.xml');
  assert.ok(compararFacturas(factura, otroReceptor).length);
  console.log('OK: importación XML/TXT, CDC, emisor, receptor y líneas.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
