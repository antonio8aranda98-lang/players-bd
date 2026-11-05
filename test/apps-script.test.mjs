import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {BOOKS} from '../lib/sources.mjs';
const code=await readFile(new URL('../apps-script/Code.gs',import.meta.url),'utf8');
const manifest=JSON.parse(await readFile(new URL('../apps-script/appsscript.json',import.meta.url),'utf8'));
function runtime(email){
  const calls=[];
  const context=vm.createContext({Session:{getActiveUser:()=>({getEmail:()=>email})},SpreadsheetApp:{openById:id=>{
    calls.push(id);return {getSheetByName:name=>{
      const rows=name==='Marina Baixa Cup'?[['Nombre','Apellidos','Número de teléfono','Correo electrónico','Cuál es tu fecha de nacimiento?','Ciudad/Localidad','Estado/Región/Provincia','En qué posición juegas?','Qué estudias actualmente?'],['Jugador','Prueba','+34000000000','test@example.com','12/01/2008','Getafe','Madrid','POR','1 Bachiller']]:[];
      return {getLastRow:()=>rows.length,getLastColumn:()=>rows[0]?.length||0,getRange:()=>({getDisplayValues:()=>rows})};
    }};
  }}});
  new vm.Script(code).runInContext(context);return {context,calls};
}
test('hosted app is configured owner-only with only read and identity scopes',()=>{
  assert.equal(manifest.webapp.access,'MYSELF');assert.equal(manifest.webapp.executeAs,'USER_ACCESSING');
  assert.deepEqual(manifest.oauthScopes,['https://www.googleapis.com/auth/spreadsheets.readonly','https://www.googleapis.com/auth/userinfo.email']);
});
test('hosted app denies anonymous and other accounts before reading any sheets',()=>{
  for(const email of ['', 'other@example.com']){const {context,calls}=runtime(email);assert.throws(()=>context.getWorkbookData(BOOKS[1].id),/privada/);assert.equal(calls.length,0);}
});
test('hosted read is restricted to the five configured workbooks',()=>{
  const {context,calls}=runtime('antonio8aranda98@gmail.com');assert.throws(()=>context.getWorkbookData('unlisted'),/no autorizado/);assert.equal(calls.length,0);
  const output=JSON.parse(context.getWorkbookData(BOOKS[1].id));assert.equal(output.players.length,1);assert.equal(output.players[0].position,'Portero');assert.equal(output.players[0].province,'Madrid');assert.equal(output.players[0].studies,'1.º Bachillerato');assert.deepEqual(calls,[BOOKS[1].id]);
});
test('hosted frontend is self-contained and does not contain imported player data',async()=>{
  const html=await readFile(new URL('../apps-script/Index.html',import.meta.url),'utf8');
  assert.ok(!html.includes('src="/app.mjs"'));assert.ok(html.includes('google.script.run'));assert.ok(!html.includes('/api/players'));assert.ok(!html.includes('Calle ficticia'));
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
});
