import test from 'node:test';
import assert from 'node:assert/strict';
import {studies,position,geography,birthYear,filteredPlayers} from '../public/model.mjs';
import {SOURCES,normalizeSource} from '../lib/sources.mjs';
import {csv,xlsx,EXPORT_COLUMNS} from '../public/export.mjs';

test('combines province, studies and position, excluding records without the requested data',()=>{
  const records=[{province:'Madrid',studies:studies('1 Bachiller'),position:position('POR')},{province:'Madrid',studies:studies('2 Bachiller'),position:position('Portero')},{province:'Toledo',studies:studies('1 Bachiller'),position:'Portero'},{province:'Madrid',studies:studies('1 Bachiller'),position:''}];
  assert.deepEqual(filteredPlayers(records,{province:'Madrid',studies:'1.º Bachillerato',position:'Portero'}),[records[0]]);
  assert.equal(filteredPlayers(records,{position:'__missing'}).length,1);
  assert.equal(studies('1º de bachillerato'),'1.º Bachillerato');
  assert.equal(studies('2 Bachiller'),'2.º Bachillerato');
  assert.equal(studies('Nada, pero tengo bachiller o grado superior'),'Nada, pero tengo bachiller o grado superior');
});
test('geographic classification is conservative and uses explicit province when available',()=>{
  assert.deepEqual(geography('Getafe'),{province:'Madrid',community:'Madrid'});
  assert.deepEqual(geography('Comunidad valenciana'),{province:'',community:'Comunitat Valenciana'});
  assert.deepEqual(geography('Una ciudad desconocida'),{province:'',community:''});
  assert.deepEqual(geography('París','Madrid'),{province:'Madrid',community:'Madrid'});
});
test('year groups are not treated as exact years',()=>{
  assert.equal(birthYear('2006 o mayor'),'');assert.equal(birthYear('2009 o menor'),'');
  assert.equal(birthYear('633402473'),'');assert.equal(birthYear('2008-12-01T00:00:00.000Z'),'2008');assert.equal(birthYear('1/12/2008'),'2008');
});
test('historical and current layouts keep their own columns and original row numbers',()=>{
  const s=SOURCES.find(s=>s.name==='No inscritos otras pruebas');
  const old=[];Object.assign(old,{0:'Nombre',1:'Apellido',2:'+34000000000',3:'ejemplo@example.com',4:'Sí',13:'Getafe',14:'Madrid',17:'2009 o menor',19:'1 Bachiller',21:'Juvenil',23:'Primera',26:'6000'});
  const recent=[];Object.assign(recent,{0:'Otro',1:'Jugador',2:'+34000000001',3:'otro@example.com',6:'Alcorcón',7:'Madrid',11:'1 Bachiller',13:'Juvenil',15:'Primera',21:'14/03/2009',22:'POR'});
  const players=normalizeSource(s,[old,[],recent]);
  assert.equal(players.length,2);assert.equal(players[0].studies,'1.º Bachillerato');assert.equal(players[0].year,'');assert.equal(players[0].province,'Madrid');
  assert.equal(players[1].row,3);assert.equal(players[1].year,'2009');assert.equal(players[1].position,'Portero');assert.equal(players[1].raw.position,'POR');
  assert.ok(!('address' in players[0]));
});
test('main source preserves entries, skips header, and does not merge contacts',()=>{
  const s=SOURCES[0],row=[];Object.assign(row,{0:'Ana',1:'Prueba',2:'+34000000000',3:'prueba@example.com',7:'Madrid',11:'1 Bachiller',22:'Portero'});
  const p=normalizeSource(s,[['cabecera'],row,row]);assert.equal(p.length,2);assert.equal(p[0].row,2);assert.notEqual(p[0].id,p[1].id);
});
test('CSV preserves Unicode and quotes, protects formula cells and exports all rows',()=>{
  const players=Array.from({length:125},(_,i)=>({name:i===0?'=HYPERLINK("x")':'Álex; "Prueba"',phone:'+34000000000',source:'Origen',row:i+1}));
  const output=csv(players);assert.ok(output.startsWith('\uFEFF'));assert.ok(output.includes('"\'=HYPERLINK(""x"")"'));assert.ok(output.includes('"\'+34000000000"'));assert.ok(output.includes('"Álex; ""Prueba"""'));assert.equal(output.split('\r\n').length,126);
});
test('XLSX contains real OpenXML with safe text cells, all filtered rows and UTF-8',()=>{
  const output=xlsx(Array.from({length:125},(_,i)=>({name:i===0?'=1+1':'Álex',row:i+1}))),text=new TextDecoder().decode(output);
  assert.equal(new DataView(output.buffer).getUint32(0,true),0x04034b50);assert.ok(text.includes('[Content_Types].xml'));assert.ok(text.includes('r="A126"'));assert.ok(text.includes('=1+1'));assert.ok(!text.includes('<f>'));assert.ok(text.includes('Álex'));assert.equal(EXPORT_COLUMNS.length,17);
});
