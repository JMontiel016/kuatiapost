/* Prueba local sin envíos a SIFEN: node tests/probar_backend.cjs */
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'kuatiapost-test-'));
delete process.env.TURSO_DATABASE_URL;
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.VERCEL;
process.env.KUATIAPOST_DATA_DIR = path.join(temp, 'db');
const m = require('../lib/usuario/almacen.ts');

async function probar() {
  const usuario1=await m.registrar('a@example.com','ClaveEjemplo#1234');
  const usuario2=await m.registrar('b@example.com','ClaveEjemplo#5678');
  assert.notEqual(usuario1.id,usuario2.id);
  assert.equal((await m.autenticar('a@example.com','ClaveIncorrecta')),null);
  assert.equal((await m.autenticar('a@example.com','ClaveEjemplo#1234')).id,usuario1.id);
  const sesion=await m.nuevaSesion(usuario1);
  assert.equal((await m.obtenerUsuario(sesion.token)).id,usuario1.id);
  assert.equal((await m.obtenerUsuario('inexistente')),null);
  await m.guardarEspacio(usuario1.id,{body:'{"demo":"privado"}',token:'NO_GUARDAR',password:'NO_GUARDAR',connections:[{id:'x',name:'Producción',url:'https://ejemplo.com',token:'NO_GUARDAR'}]});
  assert.equal((await m.leerEspacio(usuario2.id)).body,undefined);
  assert.equal((await m.leerEspacio(usuario1.id)).body,'{"demo":"privado"}');
  assert.equal((await m.leerEspacio(usuario1.id)).token,undefined);
  assert.equal((await m.leerEspacio(usuario1.id)).connections[0].token,undefined);
  const cdc='01234567890123456789012345678901234567890123';
  const lineas=[{cdc,indice:0,cantidad:'3',total:'8'}];
  const id1='11111111-1111-4111-8111-111111111111';
  const id2='22222222-2222-4222-8222-222222222222';
  await m.reservarRemision(usuario1.id,id1,lineas);
  await assert.rejects(() => m.reservarRemision(usuario1.id,id1,lineas),/ya fue procesado/);
  await assert.rejects(() => m.reservarRemision(usuario1.id,id2,[{cdc,indice:0,cantidad:'6',total:'8'}]),/insuficiente/);
  const respuesta=await m.resolverRemision(usuario1.id,id1,{http:200,data:{Estado:'Aprobado',CDC:'7'.repeat(44)}});
  assert.equal(respuesta.estado,'aprobado');
  await assert.rejects(() => m.resolverRemision(usuario1.id,id1,{http:200,data:{Estado:'Aprobado'}}),/ya se procesó/);
  await m.reservarRemision(usuario1.id,id2,[{cdc,indice:0,cantidad:'5',total:'8'}]);
  assert.equal((await m.resolverRemision(usuario1.id,id2,{http:200,data:{Estado:'Pendiente'}})).estado,'incierto');
  await assert.rejects(() => m.reservarRemision(usuario1.id,'33333333-3333-4333-8333-333333333333',[{cdc,indice:0,cantidad:'1',total:'8'}]),/insuficiente/);
  assert.equal((await m.listarRemisiones(usuario2.id)).length,0);
  await m.cerrarSesion(sesion.token);
  assert.equal((await m.obtenerUsuario(sesion.token)),null);
  console.log('OK: cuentas aisladas, credenciales excluidas, sesiones, SQLite y reservas atómicas.');
}
probar().finally(() => fs.rmSync(temp, { recursive: true, force: true })).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
