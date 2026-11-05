let pagesToken=null,pagesTokenExpires=0,pagesSnapshot=null,pagesPending=null,pagesReadAt=0;
const publicSources=SOURCES.map(({id,name,label,workbook,spreadsheetId,gid,primary,note})=>({id,name,label,workbook,spreadsheetId,gid,primary,note}));
function emptyPagesData(message='Conecta tu cuenta de Google para consultar tus jugadores.'){
  return {...(pagesSnapshot||{players:[],bookUpdates:{},fetchedAt:null}),books:BOOKS,sources:publicSources,hosted:true,connected:false,connectionRequired:true,lastError:message};
}
async function readPagesBook(book){
  const sources=SOURCES.filter(s=>s.spreadsheetId===book.id);
  const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${book.id}/values:batchGet`);
  for(const s of sources)url.searchParams.append('ranges',`'${s.name.replaceAll("'","''")}'!A1:${s.lastColumn}`);
  url.searchParams.set('valueRenderOption','FORMATTED_VALUE');
  const response=await fetch(url,{headers:{Authorization:`Bearer ${pagesToken}`},cache:'no-store',signal:AbortSignal.timeout(45000)});
  if(response.status===401){pagesToken=null;throw new Error('La sesión de Google ha caducado. Pulsa Conectar con Google.');}
  if(!response.ok)throw new Error(response.status===403?'No tienes acceso a este archivo o falta activar Google Sheets API.':'No se puede leer el archivo de Google.');
  const result=await response.json();
  if(result.spreadsheetId!==book.id||result.valueRanges?.length!==sources.length)throw new Error('Respuesta incompleta de Google.');
  return {players:sources.flatMap((s,i)=>normalizeSource(s,result.valueRanges[i].values||[])),fetchedAt:new Date().toISOString()};
}
async function readPages(){
  if(pagesPending)return pagesPending;
  if(!pagesToken||Date.now()>=pagesTokenExpires)return emptyPagesData(pagesSnapshot?'La sesión de Google ha caducado. Conecta de nuevo para actualizar.':undefined);
  pagesPending=(async()=>{
    const responses=await Promise.allSettled(BOOKS.map(readPagesBook)),players=[],updated=new Set(),errors=[],bookUpdates={...(pagesSnapshot?.bookUpdates||{})};
    for(let i=0;i<responses.length;i++){
      const response=responses[i],book=BOOKS[i];
      if(response.status==='fulfilled'){updated.add(book.id);players.push(...response.value.players);bookUpdates[book.id]={fetchedAt:response.value.fetchedAt,error:null};}
      else{const message=book.title+': '+response.reason.message;errors.push(message);bookUpdates[book.id]={...bookUpdates[book.id],error:message};}
    }
    if(!updated.size)throw new Error(errors.join(' · '));
    players.push(...(pagesSnapshot?.players||[]).filter(p=>!updated.has(p.spreadsheetId)));
    const dates=BOOKS.map(b=>bookUpdates[b.id]?.fetchedAt);
    pagesSnapshot={players,books:BOOKS,sources:publicSources,bookUpdates,hosted:true,connected:Boolean(pagesToken),connectionRequired:!pagesToken,fetchedAt:dates.every(Boolean)?dates.sort()[0]:null,lastError:errors.join(' · ')};
    pagesReadAt=Date.now();return pagesSnapshot;
  })().finally(()=>pagesPending=null);
  return pagesPending;
}
async function getAppData(){
  if(!pagesToken||Date.now()>=pagesTokenExpires)return emptyPagesData(pagesSnapshot?'La sesión de Google ha caducado. Conecta de nuevo para actualizar.':undefined);
  if(pagesSnapshot&&Date.now()-pagesReadAt<300000)return pagesSnapshot;
  return readPages();
}
async function refreshAppData(){const result=await readPages();if(result.connectionRequired)throw new Error(result.lastError);return {ok:true,warning:result.lastError};}
function connectGoogle(){
  if(!GOOGLE_CLIENT_ID)throw new Error('Falta configurar el identificador OAuth de Google para esta dirección de GitHub Pages. No necesitas publicar tus hojas.');
  if(!window.google?.accounts?.oauth2)throw new Error('Google aún está cargando. Espera unos segundos y vuelve a pulsar Conectar.');
  return new Promise((resolve,reject)=>{
    const client=google.accounts.oauth2.initTokenClient({client_id:GOOGLE_CLIENT_ID,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',callback:response=>{
      if(response.error){reject(new Error('Google no ha autorizado la lectura.'));return;}
      pagesToken=response.access_token;pagesTokenExpires=Date.now()+Math.max(0,Number(response.expires_in||3600)-60)*1000;pagesReadAt=0;resolve();
    },error_callback:()=>reject(new Error('La conexión de Google no se ha completado.'))});
    client.requestAccessToken({prompt:''});
  });
}
document.getElementById('connection-help').textContent=GOOGLE_CLIENT_ID?'Al abrir la web, conecta tu cuenta. La lectura se actualiza cada cinco minutos mientras la conexión esté vigente.':'La web está preparada. Falta registrar esta URL de GitHub Pages en la conexión de Google.';
document.getElementById('connect-google').addEventListener('click',async()=>{
  const button=document.getElementById('connect-google');button.disabled=true;
  try{await connectGoogle();await loadData();}catch(e){document.getElementById('connection-help').textContent=e.message;}finally{button.disabled=false;}
});
