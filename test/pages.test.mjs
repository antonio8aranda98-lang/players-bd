import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {BOOKS,SOURCES,normalizeSource} from '../lib/sources.mjs';
const transport=await readFile(new URL('../scripts/pages-transport.js',import.meta.url),'utf8');
function runtime(fetcher){
  const document={getElementById:()=>({textContent:'',addEventListener:()=>{}})};
  const context=vm.createContext({GOOGLE_CLIENT_ID:'',BOOKS,SOURCES,normalizeSource,document,window:{},URL,AbortSignal,fetch:fetcher,setTimeout});
  new vm.Script(transport+'\nglobalThis.transportTest={getAppData,readPagesBook,connectGoogle,setToken:t=>{pagesToken=t;pagesTokenExpires=Date.now()+60000;}};').runInContext(context);
  return context.transportTest;
}
test('Pages makes no Sheets requests until Google grants a session token',async()=>{
  let calls=0;const client=runtime(async()=>{calls++;throw new Error('Unexpected');});
  const result=await client.getAppData();assert.equal(result.connectionRequired,true);assert.equal(result.players.length,0);assert.equal(calls,0);assert.throws(()=>client.connectGoogle(),/identificador OAuth/);
});
test('Pages reads the authorized fixed workbook with a bearer header and rejects responses from other files',async()=>{
  let seenURL,seenOptions;const client=runtime(async(url,options)=>{seenURL=url;seenOptions=options;return {ok:true,status:200,json:async()=>({spreadsheetId:'foreign',valueRanges:[]})};});client.setToken('test-only');
  await assert.rejects(client.readPagesBook(BOOKS[1]),/incompleta/);
  assert.ok(seenURL.pathname.includes(BOOKS[1].id));assert.equal(seenOptions.headers.Authorization,'Bearer test-only');assert.equal(seenOptions.cache,'no-store');
});
test('published Pages bundle contains no imported player snapshot, Node server or stored OAuth token',async()=>{
  const html=await readFile(new URL('../docs/index.html',import.meta.url),'utf8');
  assert.ok(html.includes('https://accounts.google.com/gsi/client'));assert.ok(html.includes('https://sheets.googleapis.com/v4/spreadsheets/'));
  assert.ok(!html.includes('localStorage'));assert.ok(!html.includes('sessionStorage'));assert.ok(!html.includes('/api/players'));assert.ok(!html.includes('google.script.run'));assert.ok(!html.includes('cache.json'));
  new vm.Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
});
