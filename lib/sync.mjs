import {BOOKS,SOURCES,normalizeSource} from './sources.mjs';

export async function readWorkbook(book,bearer,fetcher=fetch) {
  const sources=SOURCES.filter(s=>s.spreadsheetId===book.id);
  const url=new URL(`https://sheets.googleapis.com/v4/spreadsheets/${book.id}/values:batchGet`);
  for(const source of sources)url.searchParams.append('ranges',`'${source.name.replaceAll("'","''")}'!A1:${source.lastColumn}`);
  url.searchParams.set('valueRenderOption','FORMATTED_VALUE');
  const response=await fetcher(url,{headers:{Authorization:`Bearer ${bearer}`},signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(response.status===403?'Acceso denegado: comprueba que la cuenta de servicio sea lectora de este archivo.':'Google no ha podido devolver los datos.');
  const data=await response.json();
  if(data.spreadsheetId!==book.id||data.valueRanges?.length!==sources.length)throw new Error('Respuesta de Google incompleta o de otro archivo.');
  return sources.flatMap((s,i)=>normalizeSource(s,data.valueRanges[i].values||[]));
}

export async function refreshBooks(previous,reader,now=new Date().toISOString()) {
  const results=await Promise.allSettled(BOOKS.map(book=>reader(book)));
  const updated=new Set(),failures=[];let players=[];
  const bookUpdates={...previous.bookUpdates};
  for(let i=0;i<BOOKS.length;i++){
    const book=BOOKS[i],result=results[i];
    if(result.status==='fulfilled'){
      if(!Array.isArray(result.value)||result.value.some(p=>p.spreadsheetId!==book.id))throw new Error('Registros con origen incorrecto.');
      updated.add(book.id);players.push(...result.value);bookUpdates[book.id]={fetchedAt:now,error:null};
    }else{
      const error=`${book.title}: ${result.reason?.message||'Error de lectura'}`;failures.push(error);bookUpdates[book.id]={...bookUpdates[book.id],error};
    }
  }
  if(!updated.size)throw new Error(failures.join(' · '));
  players.push(...previous.players.filter(p=>!updated.has(p.spreadsheetId)));
  const dates=BOOKS.map(b=>bookUpdates[b.id]?.fetchedAt);
  const fetchedAt=dates.every(Boolean)?dates.sort()[0]:null;
  return {snapshot:{version:2,players,bookUpdates,fetchedAt,importedAt:now},warning:failures.length?`Se conserva la copia anterior de ${failures.length} archivo(s). ${failures.join(' · ')}`:''};
}
