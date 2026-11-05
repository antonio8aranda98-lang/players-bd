import test from 'node:test';
import assert from 'node:assert/strict';
import {BOOKS,SOURCES,normalizeSource,upgradePlayer} from '../lib/sources.mjs';
import {filteredPlayers} from '../public/model.mjs';
import {refreshBooks,readWorkbook} from '../lib/sync.mjs';

test('same tab ID in different files keeps records and origins separate',()=>{
  assert.equal(new Set(SOURCES.map(s=>s.id)).size,SOURCES.length);
  const sources=SOURCES.filter(s=>s.gid===0&&s.layout!=='empty');
  const players=sources.flatMap(s=>{
    const rows=Array.from({length:6},()=>[]);
    if(s.layout==='marina-copy')Object.assign(rows[5],{1:'Jugador',2:'Prueba'});
    else if(s.layout==='history')rows[0]=['Jugador','Prueba','+34000000000'];
    else Object.assign(rows[4],{2:'Jugador',3:'Prueba'});
    return normalizeSource(s,rows);
  });
  assert.equal(players.length,3);assert.equal(new Set(players.map(p=>p.id)).size,3);
  assert.ok(players.every(p=>p.sourceId.startsWith(p.spreadsheetId+':')));
  assert.equal(filteredPlayers(players,{workbook:BOOKS[1].title}).length,1);
});
test('repeated form questions and multiple positions are searchable without mixing contacts',()=>{
  const s=SOURCES.find(s=>s.spreadsheetId===BOOKS[3].id&&s.layout==='headers');
  const header=['Nombre','Apellido(s)','Número de teléfono','Correo electrónico','Cuál es tu fecha de nacimiento?','Ciudad/Pueblo','Estado/Región/Provincia','En qué posición juegas?','En qué posición juegas?','Qué estudias actualmente?','Qué estudias actualmente?'];
  const row=['Jugador','Prueba','+34000000000','test@example.com','12/01/2008','Getafe','Madrid','','POR, MC','','1 Bachiller'];
  const [p]=normalizeSource(s,[header,row]);
  assert.deepEqual(p.positions,['Portero','Mediocentro']);assert.equal(p.email,'test@example.com');
  assert.equal(filteredPlayers([p],{province:'Madrid',studies:'1.º Bachillerato',position:'Portero'}).length,1);
  assert.equal(p.row,2);assert.equal(p.spreadsheetId,BOOKS[3].id);
});
test('United form accepts both Spanish full name and later English split fields',()=>{
  const s=SOURCES.find(s=>s.spreadsheetId===BOOKS[4].id);
  const h=['Primero de todo ¿Cuál es tu nombre completo?','¿Cuál es tu correo electrónico?','¿Cuál es tu número de teléfono?','First name','Last name','Email','Phone number','Vamos con la parte académica. ¿Qué estudias actualmente?','Selecciona tu comunidad autónoma'];
  const p=normalizeSource(s,[h,['Uno Prueba','one@example.com','+34000000001','','','','','1 Bachiller','Madrid'],['','','','Dos','Prueba','two@example.com','+34000000002','ESO','Cataluña']]);
  assert.equal(p.length,2);assert.equal(p[0].name,'Uno Prueba');assert.equal(p[1].name,'Dos Prueba');assert.equal(p[1].phone,'+34000000002');assert.equal(p[1].community,'Cataluña');
});
test('historical rows distinguish short sports list and full form without inferring residence from tab title',()=>{
  const s=SOURCES.find(s=>s.name==='MADRID ANTIGUOS');
  const long=['Dos','Prueba','+34000000002','two@example.com','12/01/2008','Calle ficticia','','Getafe','Madrid','','España','Club Prueba','JUVENIL','Primera','POR'];
  const p=normalizeSource(s,[['Uno','Prueba','+34000000001','JUVENIL','Primera','MC','Club Prueba'],long]);
  assert.equal(p[0].province,'');assert.equal(p[0].studies,'');assert.equal(p[0].club,'Club Prueba');
  assert.equal(p[1].province,'Madrid');assert.equal(p[1].position,'Portero');assert.equal(p[1].year,'2008');
});
test('pasted alternate form is detected structurally instead of misclassifying its street as birth date',()=>{
  const s=SOURCES.find(s=>s.spreadsheetId===BOOKS[3].id&&s.layout==='headers');
  const h=['Nombre','Apellidos','Número de teléfono','Correo electrónico','Cuál es tu fecha de nacimiento?'];
  const row=[];Object.assign(row,{0:'Uno',1:'Prueba',2:'+34000000000',3:'test@example.com',4:'Calle ficticia',6:'Getafe',7:'Madrid',9:'España',10:'12/01/2008',11:'Si',12:'POR',13:'Juvenil',14:'Primera',16:'1 Bachiller',33:'150 al mes'});
  const [p]=normalizeSource(s,[h,row]);assert.equal(p.birth,'12/01/2008');assert.equal(p.position,'Portero');assert.equal(p.studies,'1.º Bachillerato');assert.equal(p.club,undefined);assert.ok(!JSON.stringify(p).includes('Calle ficticia'));
});
test('refresh replaces successful books and retains the previous copy of a failed book with a warning',async()=>{
  const previous={players:BOOKS.map(b=>({id:b.id,spreadsheetId:b.id,name:'Anterior'})),bookUpdates:Object.fromEntries(BOOKS.map(b=>[b.id,{fetchedAt:'2026-11-04T12:00:00Z'}]))};
  const {snapshot,warning}=await refreshBooks(previous,async b=>{if(b.id===BOOKS[2].id)throw new Error('Sin permiso');return [{id:b.id,spreadsheetId:b.id,name:'Nuevo'}];},'2026-11-05T12:00:00Z');
  assert.equal(snapshot.players.length,5);assert.equal(snapshot.players.find(p=>p.spreadsheetId===BOOKS[2].id).name,'Anterior');assert.equal(snapshot.players.find(p=>p.spreadsheetId===BOOKS[1].id).name,'Nuevo');
  assert.match(warning,/SuperDrafts/);assert.equal(snapshot.fetchedAt,'2026-11-04T12:00:00Z');assert.equal(previous.players[0].name,'Anterior');
});
test('total read failure does not discard the cache, and foreign records are rejected',async()=>{
  const prior={players:[{id:'keep',spreadsheetId:BOOKS[0].id}],bookUpdates:{}};
  await assert.rejects(refreshBooks(prior,async()=>{throw new Error('Sin conexión');}),/Sin conexión/);assert.equal(prior.players[0].id,'keep');
  await assert.rejects(refreshBooks(prior,async()=>[{spreadsheetId:'wrong'}]),/origen incorrecto/);
});
test('reads target their own workbook and reject incomplete responses',async()=>{
  const book=BOOKS[1];let requested;
  await assert.rejects(readWorkbook(book,'test-token',async url=>{requested=url;return {ok:true,json:async()=>({spreadsheetId:book.id,valueRanges:[{values:[]}]})};}),/incompleta/);
  assert.ok(requested.pathname.includes(book.id));assert.equal(requested.searchParams.getAll('ranges').length,2);
});
test('legacy cache gains workbook provenance and an empty tab with new unknown columns cannot silently drop data',()=>{
  const source=SOURCES[0];const p=upgradePlayer({gid:source.gid,row:2,position:'POR',studies:'1 Bachiller',raw:{position:'POR',studies:'1 Bachiller'}});
  assert.equal(p.spreadsheetId,BOOKS[0].id);assert.equal(p.sourceId,source.id);
  const empty=SOURCES.find(s=>s.layout==='empty');assert.throws(()=>normalizeSource(empty,[['new data']]),/antes vacía/);
});
