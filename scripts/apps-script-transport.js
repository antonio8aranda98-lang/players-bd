let hostedSnapshot=null,hostedPending=null,hostedReadAt=0;
function googleBook(book){
  return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(value=>{
    try{const result=JSON.parse(value);if(result.spreadsheetId!==book.id||!Array.isArray(result.players)||result.players.some(p=>p.spreadsheetId!==book.id))throw new Error('Google devolvió un origen incorrecto.');resolve(result);}catch(e){reject(e);}
  }).withFailureHandler(error=>reject(new Error(error.message||'No se puede leer el archivo.'))).getWorkbookData(book.id));
}
async function readHosted(){
  if(hostedPending)return hostedPending;
  hostedPending=(async()=>{
    const responses=await Promise.allSettled(HOSTED_BOOKS.map(googleBook));
    const updated=new Set(),bookUpdates={...(hostedSnapshot?.bookUpdates||{})},players=[],errors=[];
    for(let i=0;i<responses.length;i++){
      const response=responses[i],book=HOSTED_BOOKS[i];
      if(response.status==='fulfilled'){updated.add(book.id);players.push(...response.value.players);bookUpdates[book.id]={fetchedAt:response.value.fetchedAt,error:null};}
      else{const message=book.title+': '+response.reason.message;errors.push(message);bookUpdates[book.id]={...bookUpdates[book.id],error:message};}
    }
    if(!updated.size)throw new Error(errors.join(' · '));
    players.push(...(hostedSnapshot?.players||[]).filter(p=>!updated.has(p.spreadsheetId)));
    const dates=HOSTED_BOOKS.map(b=>bookUpdates[b.id]?.fetchedAt);
    hostedSnapshot={players,bookUpdates,books:HOSTED_BOOKS,sources:HOSTED_SOURCES,hosted:true,connected:true,fetchedAt:dates.every(Boolean)?dates.sort()[0]:null,lastError:errors.length?'Algunos archivos no se han actualizado. '+errors.join(' · '):''};
    hostedReadAt=Date.now();return hostedSnapshot;
  })().finally(()=>{hostedPending=null;});
  return hostedPending;
}
async function getAppData(){if(hostedSnapshot&&Date.now()-hostedReadAt<300000)return hostedSnapshot;return readHosted();}
async function refreshAppData(){const result=await readHosted();return {ok:true,warning:result.lastError||null};}
