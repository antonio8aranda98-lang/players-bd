import {clean,fold,REGIONS,filteredPlayers} from './model.mjs';
import {csv,xlsx} from './export.mjs';
import {getAppData,refreshAppData} from './transport.mjs';
const $=s=>document.querySelector(s),num=n=>new Intl.NumberFormat('es-ES').format(n),esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const missing='<span class="missing">Sin informar</span>';
const labels={community:'Comunidad',province:'Provincia',studies:'Estudios',position:'Posición',category:'Categoría',year:'Año de nacimiento',workbook:'Archivo',source:'Pestaña / origen'};
let data={players:[],sources:[],connected:false},selectedSources=new Set(),base=[],results=[],filters={},page=1,currentView='overview',sort='name';
let toastTimer,searchTimer,loading=false;
const PAGE_SIZE=50;
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,7000);}
function setView(view){currentView=view;for(const id of ['overview','players'])$('#'+id).hidden=id!==view;document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#breadcrumb').textContent=view==='overview'?'Resumen':'Explorar jugadores';window.scrollTo({top:0,behavior:'instant'});}
function options(key,placeholder,selected=''){
  const values=[...new Set(base.flatMap(p=>key==='position'?(p.positions||[p.position]):key==='studies'?(p.studyValues||[p.studies]):[p[key]]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es',{numeric:true,sensitivity:'base'}));
  if(key==='year')values.reverse();
  return `<option value="">${placeholder}</option>`+values.map(v=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(v)}</option>`).join('')+`<option value="__missing"${selected==='__missing'?' selected':''}>Sin informar</option>`;
}
function rebuildBase(){
  base=data.players.filter(p=>selectedSources.has(p.sourceId));
  const bookCount=new Set(data.sources.filter(s=>selectedSources.has(s.id)).map(s=>s.spreadsheetId)).size;
  $('#source-count').textContent=`${bookCount} archivos · ${selectedSources.size} pestañas`;
  $('#filters').innerHTML=Object.entries(labels).map(([key,label])=>`<label>${label}<select data-filter="${key}" aria-label="${label}">${options(key,`Todos · ${label.toLowerCase()}`,filters[key])}</select></label>`).join('');
  for(const key of ['province','studies','position'])$('#quick-'+key).innerHTML=options(key,`Todos · ${labels[key].toLowerCase()}`,$('#quick-'+key).value);
  renderOverview();applyFilters();renderSources();
}
function countBy(key){const map=new Map();for(const p of base)if(p[key])map.set(p[key],(map.get(p[key])||0)+1);return [...map].sort((a,b)=>b[1]-a[1]);}
function renderOverview(){
  const located=base.filter(p=>p.community).length,positions=base.filter(p=>p.position).length,educated=base.filter(p=>p.studies).length;
  const stats=[['Registros disponibles',num(base.length),'En las fuentes seleccionadas','↗','primary'],['Territorios representados',num(countBy('community').length),`${num(located)} registros con ubicación clasificada`,'⌁',''],['Con posición informada',num(positions),`${base.length?Math.round(positions/base.length*100):0}% de los registros`,'◎',''],['Con estudios informados',num(educated),`${base.length?Math.round(educated/base.length*100):0}% de los registros`,'▤','']];
  $('#stats').innerHTML=stats.map(([label,value,foot,icon,style])=>`<article class="stat-card ${style}"><span class="stat-label">${label}</span><span class="stat-icon">${icon}</span><div class="stat-number">${value}</div><div class="stat-foot">${foot}</div></article>`).join('');
  const counts=new Map(countBy('community')),max=Math.max(1,...counts.values());
  const tones=['#edf1e7','#dce7c8','#c3d5a6','#a9c385','#8caf65'];
  $('#map').innerHTML=`<svg viewBox="0 0 484 340" role="group" aria-label="Mapa esquemático de comunidades autónomas. Cada casilla permite filtrar por comunidad.">${REGIONS.map(([name,x,y,abbr])=>{
    const count=counts.get(name)||0,tx=x*66+(y%2?16:0),ty=y*46+4,level=count?Math.min(4,Math.max(1,Math.ceil(Math.sqrt(count/max)*4))):0;
    return `<g class="map-cell${count?'':' no-data'}" tabindex="0" role="button" data-region="${esc(name)}" aria-label="${esc(name)}: ${num(count)} registros" transform="translate(${tx},${ty})"><title>${esc(name)} · ${num(count)} registros</title><rect width="62" height="43" rx="7" fill="${tones[level]}"/><text x="31" y="14" text-anchor="middle">${abbr}</text><text x="31" y="31" text-anchor="middle" class="map-value">${count?num(count):'—'}</text></g>`;
  }).join('')}</svg>`;
  renderGeography();
}
function renderGeography(){const key=$('#geo-level').value,counts=countBy(key),max=counts[0]?.[1]||1,unknown=base.filter(p=>!p[key]).length;
  $('#geo-bars').innerHTML=counts.slice(0,6).map(([name,n])=>`<button class="geo-row" data-geo-key="${key}" data-geo-value="${esc(name)}"><span class="geo-label"><span>${esc(name)}</span><strong>${num(n)}</strong></span><div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div></button>`).join('')+`<div class="geo-unknown"><span>Sin clasificar / sin informar</span><span>${num(unknown)}</span></div>`;
}
function applyFilters(){
  results=filteredPlayers(base,filters);
  results.sort((a,b)=>sort==='year-desc'?(Number(b.year||0)-Number(a.year||0)||a.name.localeCompare(b.name,'es')):sort==='source'?(a.source.localeCompare(b.source,'es')||a.name.localeCompare(b.name,'es')):a.name.localeCompare(b.name,'es',{sensitivity:'base'}));
  const pages=Math.max(1,Math.ceil(results.length/PAGE_SIZE));page=Math.min(page,pages);
  $('#result-count').textContent=`${num(results.length)} ${results.length===1?'registro encontrado':'registros encontrados'}`;
  $('#active-filters').innerHTML=Object.entries(filters).filter(([,value])=>value).map(([key,value])=>`<span class="filter-chip">${esc(labels[key]||'Búsqueda')}: ${esc(value==='__missing'?'Sin informar':value)}</span>`).join('');
  const visible=results.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE);
  $('#player-rows').innerHTML=visible.map(p=>{
    const initials=p.name.split(' ').filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase();
    return `<tr data-player="${esc(p.id)}"><td><div class="player-cell"><div class="initials" aria-hidden="true">${esc(initials)}</div><div><div class="player-name">${esc(p.name)}</div><div class="player-sub">${esc(p.category||'Categoría sin informar')}</div></div></div></td><td>${esc(p.province||p.community||p.location)||missing}${p.location&&p.location!==p.province?`<div class="player-sub">${esc(p.location)}</div>`:''}</td><td>${esc(p.studies)||missing}</td><td>${p.position?`<span class="position-badge${p.position==='Portero'?' keeper':''}">${esc(p.position)}</span>`:missing}</td><td>${esc(p.year)||missing}</td><td><span class="source-text" title="${esc(p.source)}">${esc(p.source)}</span></td><td><button class="row-open" data-open-player="${esc(p.id)}" aria-label="Abrir ficha de ${esc(p.name)}">↗</button></td></tr>`;
  }).join('')||'<tr><td colspan="7" class="empty"><strong>No hay perfiles con estos filtros</strong>Prueba a ampliar la ubicación o quitar alguno de los filtros.<br>Las filas sin ese dato informado no coinciden con un filtro específico.</td></tr>';
  $('#page-info').textContent=results.length?`${num((page-1)*PAGE_SIZE+1)}–${num(Math.min(page*PAGE_SIZE,results.length))} de ${num(results.length)} registros`:'0 registros';
  $('#page-number').textContent=`${page} / ${pages}`;$('#prev-page').disabled=page<=1;$('#next-page').disabled=page>=pages;
  $('#export-csv').disabled=results.length===0;$('#export-xlsx').disabled=results.length===0;
}
function setFilters(next){filters={...next};page=1;$('#search').value=filters.q||'';rebuildBase();setView('players');}
function detail(id){const p=data.players.find(p=>p.id===id);if(!p)return;
  const field=(name,value)=>`<div class="profile-field"><dt>${name}</dt><dd>${value?esc(value):missing}</dd></div>`;
  const sourceURL=`https://docs.google.com/spreadsheets/d/${p.spreadsheetId}/edit#gid=${p.gid}&range=A${p.row}`;
  $('#player-detail').innerHTML=`<div class="profile-hero"><div class="dialog-heading"><div><div class="eyebrow">FICHA DE JUGADOR / ${esc(p.source)}</div><h2>${esc(p.name)}</h2></div><button data-close="player-dialog" class="close-button" aria-label="Cerrar ficha">×</button></div><div class="profile-badges">${[p.position,p.category,p.year].filter(Boolean).map(v=>`<span class="position-badge">${esc(v)}</span>`).join('')}</div></div><div class="profile-body"><dl class="profile-fields">${field('Teléfono',p.phone)}${field('Email',p.email)}${field('Localidad / ubicación declarada',p.location)}${field('Provincia',p.province)}${field('Comunidad autónoma',p.community)}${field('Nacimiento / respuesta original',p.birth)}</dl><h3 class="profile-section">Perfil académico y deportivo</h3><dl class="profile-fields">${field('Estudios',p.studies)}${field('Posición',p.position)}${field('Categoría',p.category)}${field('Liga',p.league)}${field('Club',p.club)}${field('Presupuesto declarado',p.budget)}</dl><details><summary class="text-button">Ver datos originales de clasificación</summary><p class="original-data">Ubicación: ${esc(p.raw.location||'Sin informar')} · Provincia: ${esc(p.raw.province||'Sin informar')} · Comunidad: ${esc(p.raw.community||'Sin informar')}</p><p class="original-data">Estudios: ${esc(p.raw.studies||'Sin informar')} · Posición: ${esc(p.raw.position||'Sin informar')}</p></details><div class="profile-source"><span>Fila ${p.row}${p.submitted?` · ${esc(p.submitted)}`:''}</span><a href="${esc(sourceURL)}" target="_blank" rel="noopener noreferrer">Ver fila en Google Sheets ↗</a></div></div>`;
  $('#player-dialog').showModal();
}
function renderSources(){
  $('#source-options').innerHTML=(data.books||[]).map(book=>{
    const status=data.bookUpdates?.[book.id],stamp=status?.fetchedAt?new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(status.fetchedAt)):'Sin importar';
    return `<section class="source-group"><h3>${esc(book.title)}</h3><p class="source-stamp">${data.hosted?'Lectura':'Copia local'} · ${esc(stamp)}${status?.error?` · ${esc(status.error)}`:''}</p>${data.sources.filter(s=>s.spreadsheetId===book.id).map(s=>`<div class="source-option"><label><input type="checkbox" value="${esc(s.id)}" data-source${selectedSources.has(s.id)?' checked':''}><span>${esc(s.name)}<small>${s.primary?'Formulario / fuente de entrada':'Lista complementaria'}${s.note?` · ${esc(s.note)}`:''}</small></span></label><span>${num(data.players.filter(p=>p.sourceId===s.id).length)}</span></div>`).join('')}</section>`;
  }).join('');
}
function download(format){
  if(!results.length)return;
  try{
    const bytes=format==='csv'?csv(results):xlsx(results),type=format==='csv'?'text/csv;charset=utf-8':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const url=URL.createObjectURL(new Blob([bytes],{type})),anchor=document.createElement('a');anchor.href=url;anchor.download=`players-${new Date().toISOString().slice(0,10)}-${results.length}.${format}`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),60000);toast(`${num(results.length)} registros exportados en ${format==='csv'?'CSV':'Excel'}.`);
  }catch{toast('No se ha podido generar el archivo. Prueba con CSV.');}
}
async function loadData(){
  if(loading)return;loading=true;
  try{const next=await getAppData();
    const initial=data.sources.length===0;data=next;if(initial)selectedSources=new Set(data.sources.filter(s=>s.primary).map(s=>s.id));
    const stamp=data.fetchedAt?new Intl.DateTimeFormat('es-ES',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Madrid'}).format(new Date(data.fetchedAt)):'Sin importar datos';
    $('#data-banner').classList.toggle('error',Boolean(data.lastError));
    $('#data-banner').innerHTML=`<span class="status-dot${data.connected&&!data.lastError?' live':''}"></span><span>${data.connected?'Google Sheets · consulta automática cada 5 min con la app abierta':'Copia local de Google Sheets · sincronización automática pendiente'} · ${esc(stamp)}</span>${!data.connected?'<a href="/guia" target="_blank" rel="noopener">Configurar conexión ↗</a>':''}${data.lastError?`<span>· ${esc(data.lastError)}</span>`:''}`;
    rebuildBase();
  }catch(e){$('#data-banner').classList.add('error');$('#data-banner').textContent=e.message+' Los datos ya cargados se conservan.';}
  finally{loading=false;}
}
document.addEventListener('click',e=>{
  const view=e.target.closest('[data-view]');if(view)setView(view.dataset.view);
  const close=e.target.closest('[data-close]');if(close)$('#'+close.dataset.close).close();
  const open=e.target.closest('[data-open-player]');if(open){detail(open.dataset.openPlayer);return;}
  const row=e.target.closest('[data-player]');if(row)detail(row.dataset.player);
  const geo=e.target.closest('[data-geo-key]');if(geo)setFilters({[geo.dataset.geoKey]:geo.dataset.geoValue});
  const region=e.target.closest('[data-region]');if(region)setFilters({community:region.dataset.region});
});
$('#map').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.region){e.preventDefault();setFilters({community:e.target.dataset.region});}});
$('#filters').addEventListener('change',e=>{if(!e.target.dataset.filter)return;filters[e.target.dataset.filter]=e.target.value;page=1;applyFilters();});
$('#search').addEventListener('input',e=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{filters.q=e.target.value;page=1;applyFilters();},130);});
$('#clear-filters').addEventListener('click',()=>{filters={};page=1;$('#search').value='';rebuildBase();});
$('#geo-level').addEventListener('change',renderGeography);
$('#all-locations').addEventListener('click',()=>setFilters({}));
$('#quick-search').addEventListener('click',()=>setFilters(Object.fromEntries(['province','studies','position'].map(k=>[k,$('#quick-'+k).value]).filter(([,v])=>v))));
$('#example-search').addEventListener('click',()=>setFilters({province:'Madrid',studies:'1.º Bachillerato',position:'Portero'}));
$('#sources-button').addEventListener('click',()=>$('#sources-dialog').showModal());
$('#source-options').addEventListener('change',e=>{if(e.target.hasAttribute('data-source')){if(e.target.checked)selectedSources.add(e.target.value);else selectedSources.delete(e.target.value);if(filters.source&&!data.sources.some(s=>s.label===filters.source&&selectedSources.has(s.id)))filters.source='';page=1;rebuildBase();}});
$('#sort').addEventListener('change',e=>{sort=e.target.value;page=1;applyFilters();});
$('#prev-page').addEventListener('click',()=>{page--;applyFilters();});$('#next-page').addEventListener('click',()=>{page++;applyFilters();});
$('#export-csv').addEventListener('click',()=>download('csv'));$('#export-xlsx').addEventListener('click',()=>download('xlsx'));
$('#refresh').addEventListener('click',async()=>{
  const button=$('#refresh');button.disabled=true;button.textContent='↻ Consultando…';
  try{const responseData=await refreshAppData();await loadData();toast(responseData.warning||'Datos actualizados desde los cinco archivos de Google Sheets.');}catch(e){toast(e.message);}finally{button.disabled=false;button.textContent='↻ Actualizar datos';}
});
document.addEventListener('click',e=>{const link=e.target.closest('a[href="#sources"]');if(link){e.preventDefault();$('#sources-dialog').showModal();}});
for(const d of document.querySelectorAll('dialog'))d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
await loadData();setInterval(()=>{if(data.connected&&!document.hidden)loadData();},300000);
