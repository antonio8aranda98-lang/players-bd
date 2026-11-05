export async function getAppData(){
  const response=await fetch('/api/players');
  if(!response.ok)throw new Error('No se pueden cargar los datos.');
  return response.json();
}
export async function refreshAppData(){
  const response=await fetch('/api/refresh',{method:'POST',headers:{'x-players-app':'1'}});
  const result=await response.json();
  if(!response.ok)throw new Error(result.error||'No se han podido actualizar los datos.');
  return result;
}
