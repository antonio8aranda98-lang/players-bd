import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createSign} from 'node:crypto';
import {execFile} from 'node:child_process';
import {BOOKS,SOURCES,upgradePlayer,SPREADSHEET_ID} from './lib/sources.mjs';
import {readWorkbook,refreshBooks} from './lib/sync.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const CACHE=path.join(ROOT,'.local-data/cache.json');
const PORT=Number(process.env.PLAYERS_PORT||4317);
const DEFAULT_KEY=path.join(ROOT,'.secrets/google-service-account.json');
let snapshot={players:[],fetchedAt:null},lastError='',refreshTask=null,token=null;
try{snapshot=JSON.parse(await readFile(CACHE,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
snapshot.players=snapshot.players.map(upgradePlayer);
if(!snapshot.bookUpdates)snapshot.bookUpdates={[SPREADSHEET_ID]:{fetchedAt:snapshot.fetchedAt,error:null}};
async function credentials(){try{return JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS||DEFAULT_KEY,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw new Error('No se puede leer la credencial local de Google.');}}
let connected=Boolean(await credentials());
async function accessToken(){
  if(token&&token.expires>Date.now()+60000)return token.value;
  const key=await credentials();if(!key)throw new Error('La sincronización automática necesita una cuenta de servicio de Google con acceso de lector a los cinco archivos. Abre la guía de conexión.');
  if(key.type!=='service_account'||!key.private_key||!key.client_email)throw new Error('La credencial debe ser una cuenta de servicio de Google.');
  const now=Math.floor(Date.now()/1000),b64=obj=>Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:key.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const sign=createSign('RSA-SHA256');sign.update(unsigned);
  const jwt=unsigned+'.'+sign.sign(key.private_key,'base64url');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('Google no ha autorizado la cuenta de servicio. Revisa la credencial y la hora del Mac.');
  const data=await response.json();token={value:data.access_token,expires:Date.now()+data.expires_in*1000};return token.value;
}
async function refresh(){
  if(refreshTask)return refreshTask;
  refreshTask=(async()=>{
    connected=Boolean(await credentials());
    const bearer=await accessToken();
    const {snapshot:next,warning}=await refreshBooks(snapshot,book=>readWorkbook(book,bearer));
    await mkdir(path.dirname(CACHE),{recursive:true,mode:0o700});await writeFile(CACHE+'.tmp',JSON.stringify(next),{mode:0o600});await rename(CACHE+'.tmp',CACHE);
    snapshot=next;lastError=warning;
  })().catch(e=>{lastError=e.message;throw e;}).finally(()=>{refreshTask=null;});
  return refreshTask;
}
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const host=req.headers.host||'';
  if(![`localhost:${PORT}`,`127.0.0.1:${PORT}`].includes(host)){res.writeHead(403);res.end();return;}
  const origin=req.headers.origin;if(origin&&origin!==`http://${host}`){res.writeHead(403);res.end();return;}
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  try{
    const pathname=new URL(req.url,`http://${host}`).pathname;
    if(pathname==='/api/refresh'&&req.method==='POST'){
      if(req.headers['x-players-app']!=='1')return json({error:'Petición no autorizada'},403);
      try{await refresh();return json({ok:true,warning:lastError||null});}catch(e){return json({error:e.message},connected?502:409);}
    }
    if(pathname==='/api/players'&&req.method==='GET'){
      if(connected&&(!snapshot.fetchedAt||Date.now()-Date.parse(snapshot.fetchedAt)>300000))try{await refresh();}catch{}
      return json({...snapshot,connected,lastError,books:BOOKS,sources:SOURCES.map(({id,name,label,workbook,spreadsheetId,gid,primary,note})=>({id,name,label,workbook,spreadsheetId,gid,primary,note}))});
    }
    if(req.method!=='GET')return json({error:'Método no permitido'},405);
    const filename=pathname==='/'?'index.html':pathname==='/guia'?'guide.html':pathname.slice(1);
    const allowed=new Set(['index.html','guide.html','style.css','app.mjs','model.mjs','export.mjs','transport.mjs']);
    if(!allowed.has(filename))return json({error:'No encontrado'},404);
    const data=await readFile(path.join(ROOT,'public',filename));res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'text/plain'});res.end(data);
  }catch{json({error:'No se puede completar la solicitud. Se conserva la última copia.'},500);}
});
server.listen(PORT,'127.0.0.1',()=>{
  process.stdout.write(`Players BD · http://127.0.0.1:${PORT}\nDatos locales · ${connected?'conexión de Google configurada':'sincronización automática pendiente de configurar'}\n`);
  if(process.env.PLAYERS_OPEN_BROWSER==='1')execFile('open',[`http://127.0.0.1:${PORT}`],()=>{});
});
server.on('error',e=>{if(e.code==='EADDRINUSE'){process.stderr.write(`El puerto ${PORT} está ocupado. Si Players BD ya está abierta, visita http://127.0.0.1:${PORT}.\n`);if(process.env.PLAYERS_OPEN_BROWSER==='1')execFile('open',[`http://127.0.0.1:${PORT}`],()=>{});}else process.stderr.write('No se ha podido iniciar el servidor local.\n');process.exitCode=1;});
process.on('SIGTERM',()=>server.close());process.on('SIGINT',()=>server.close());
