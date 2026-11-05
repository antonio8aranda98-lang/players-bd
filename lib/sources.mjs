import {clean, fold, geography, studies, position, birthYear} from '../public/model.mjs';
export const SPREADSHEET_ID = '1dPT5ibJ5lUCQXua46iY_8nxbk8AVti88Y0dinezUT_I';
const ORIGINAL_SOURCES = [
  {name:'Inscripcion pruebas united',gid:1807665592,lastColumn:'AD',skip:1,primary:true},
  {name:'No inscritos otras pruebas',gid:1422052653,lastColumn:'AA',skip:0,primary:true},
  {name:'Tryouts a lo bestia',gid:808734237,lastColumn:'I',skip:0,primary:true},
  {name:'Uptopro forms',gid:1919843992,lastColumn:'H',skip:0,primary:true},
  {name:'Formularios varios',gid:304095844,lastColumn:'H',skip:0,primary:true},
  {name:'APUNTADOS',gid:0,lastColumn:'K',skip:4,primary:false},
  {name:'2009 united',gid:456542093,lastColumn:'C',skip:0,primary:false}
];
export const BOOKS = [
  {id:SPREADSHEET_ID,title:'Inscripciones eventos united'},
  {id:'1LGiFO1k1jQV7JUsIMypOxCnjs6xD6VPyvFZSkFJLA8s',title:'Costa Blanca Cup Form'},
  {id:'1LgolSSjt0Pk5apRU0TsLTetBRjtV7umqs6yvwrPkYwI',title:'SuperDrafts'},
  {id:'1MzcsnEgTbEwkDxbie60piL4Iuw6uH602UelJz_vPsR0',title:'Tryouts a lo bestia'},
  {id:'1N2CwDbuBenI45pN2tzEe7_0lnd7GozHvj8DkKHzw32s',title:'Formulario United Sports Agency'}
];
const addedSources = [
  {book:1,name:'Marina Baixa Cup',gid:1023344723,lastColumn:'AV',skip:1,primary:true,layout:'headers'},
  {book:1,name:'Hoja 1',gid:0,lastColumn:'X',skip:5,primary:false,layout:'marina-copy',note:'Selección complementaria sin encabezados.'},
  {book:2,name:'Super Drafts',gid:861794478,lastColumn:'AW',skip:1,primary:true,layout:'headers'},
  {book:2,name:'Hoja 1',gid:0,lastColumn:'Z',skip:0,primary:false,layout:'empty',note:'Pestaña vacía al revisar; requiere revisar columnas si se añaden datos.'},
  {book:3,name:'Tryouts a lo bestia',gid:1285555291,lastColumn:'BH',skip:1,primary:true,layout:'headers'},
  ...[['BARCELONA ANTIGUOS',1276391815],['ALICANTE ANTIGUOS',1941218542],['VALENCIA ANTIGUOS',1035575527],['MADRID ANTIGUOS',0]].map(([name,gid])=>({book:3,name,gid,lastColumn:'Z',skip:0,primary:false,layout:'history',note:'Lista histórica. La ubicación se toma solo de las filas que la declaran; el nombre de la pestaña no se usa como domicilio.'})),
  {book:4,name:'Formulario United Sports Agency',gid:207523317,lastColumn:'BD',skip:1,primary:true,layout:'headers'}
];
export const SOURCES = [...ORIGINAL_SOURCES.map(s=>({...s,book:0})),...addedSources].map(s=>{
  const book=BOOKS[s.book];return {...s,id:`${book.id}:${s.gid}`,spreadsheetId:book.id,workbook:book.title,label:book.title===s.name?book.title:`${book.title} · ${s.name}`};
});
export const datasetKey = source => source.id;
const pick=(r,...indexes)=>indexes.map(i=>clean(r[i])).filter(Boolean).join(' / ');
const unique=values=>[...new Set(values.filter(Boolean))];
export function positionValues(value) {return unique(clean(value).replace(/portero\/a/gi,'Portero').split(/[,;/]+/).map(position).filter(Boolean));}
function main(r) {return {name:pick(r,0,1),phone:r[2],email:r[3],location:r[6],province:r[7],birth:clean(r[21])||r[10],yearGroup:r[10],studies:pick(r,11,12),category:pick(r,13,14),league:pick(r,15,16),budget:pick(r,18,19),position:r[22],community:r[23],country:r[26],club:r[27],submitted:r[28]};}
function fromHeaders(rows) {
  const headers=(rows[0]||[]).map(h=>fold(h).replace(/[¿?(),.]/g,'').trim());
  const indexes=regex=>headers.flatMap((h,i)=>regex.test(h)?[i]:[]);
  const fields={first:indexes(/^(nombre|first name)$/),last:indexes(/^apellido|^last name$/),full:indexes(/nombre completo/),phone:indexes(/numero de telefono|^phone number$/),email:indexes(/correo electronico|^email$/),birth:indexes(/fecha de nacimiento/),location:indexes(/^ciudad\/|^city\/town$/),province:indexes(/^estado\/region\/provincia$|^state\/region\/province$/),community:indexes(/selecciona tu comunidad autonoma/),country:indexes(/pais de residencia/),club:indexes(/^nombre de tu club actual$/),category:indexes(/en que categoria juegas/),league:indexes(/que liga juegas/),position:indexes(/en que posicion juegas/),studies:indexes(/que estudias actualmente/),submitted:indexes(/^submitted at$/)};
  if(!fields.first.length&&!fields.full.length)throw new Error('No se reconoce la columna de nombre. Revisa los encabezados antes de actualizar.');
  return row=>{
    const values=key=>unique(fields[key].map(i=>clean(row[i])));
    const first=key=>values(key)[0]||'';
    return {name:first('full')||[first('first'),first('last')].filter(Boolean).join(' '),phone:first('phone'),email:first('email'),birth:first('birth'),location:first('location'),province:first('province'),community:first('community'),country:first('country'),club:values('club').join(' / '),category:values('category').join(' / '),league:values('league').join(' / '),position:values('position').join(' / '),studies:values('studies').join(' / '),studyValues:unique(values('studies').map(studies)),submitted:first('submitted')};
  };
}
function historyRow(r){
  return r.length>7?{name:pick(r,0,1),phone:r[2],email:r[3],birth:r[4],location:r[7],province:r[8],country:r[10],club:r[11],category:r[12],league:r[13],position:r[14]}:{name:pick(r,0,1),phone:r[2],category:r[3],league:r[4],position:r[5],club:r[6]};
}
export function normalizeSource(source, rows) {
  if(source.layout==='empty'){
    if(rows.some(r=>r.some(v=>clean(v))))throw new Error(`La pestaña ${source.name} antes vacía contiene datos. Revisa sus columnas para incorporarlos.`);
    return [];
  }
  const headerReader=source.layout==='headers'?fromHeaders(rows):null;
  const result=[];
  for(let index=source.skip;index<rows.length;index++) {
    const r=rows[index];if(!r?.some(v=>clean(v))) continue;
    let p;
    if(headerReader){
      // A block pasted from a different form has its birth date in K, not E.
      // Detect the structure from the cells rather than hard-coding row numbers.
      if(source.spreadsheetId===BOOKS[3].id&&source.name==='Tryouts a lo bestia'&&birthYear(r[10])&&!birthYear(r[4])&&['si','no'].includes(fold(r[11])))
        p={name:pick(r,0,1),phone:r[2],email:r[3],birth:r[10],location:r[6],province:r[7],country:r[9],category:r[13],league:r[14],position:r[12],studies:r[16],budget:r[33]};
      else p=headerReader(r);
    }
    else if(source.layout==='history')p=historyRow(r);
    else if(source.layout==='marina-copy')p={name:pick(r,1,2),phone:r[3],email:r[4],birth:r[5],country:r[7],location:r[10],province:r[11],community:r[14],club:r[15],category:r[16],league:r[17],position:r[18],studies:r[19],submitted:r[20]};
    else switch(source.name) {
      case 'Inscripcion pruebas united':p=main(r);break;
      case 'No inscritos otras pruebas':
        p=['si','no','sí'].includes(fold(r[4]))?{name:pick(r,0,1),phone:r[2],email:r[3],location:r[13],province:r[14],birth:r[17],yearGroup:r[17],studies:pick(r,18,19),category:pick(r,20,21),league:pick(r,22,23),budget:pick(r,25,26)}:main(r);break;
      case 'APUNTADOS':p={name:pick(r,2,3),location:r[4],studies:r[5],category:r[6],league:r[7],budget:r[8],birth:r[9],position:r[10]};break;
      case '2009 united':p={name:r[0],phone:r[1]||r[2]};break;
      case 'Tryouts a lo bestia':p={name:pick(r,0,1),phone:r[2],email:r[3],birth:r[4],location:r[5],category:r[6],league:r[7],position:r[8]};break;
      case 'Uptopro forms':p={name:pick(r,0,1),phone:r[2],email:r[3],location:r[4],category:r[5],league:r[6],studies:r[7]};break;
      case 'Formularios varios':p={name:pick(r,0,1),phone:r[2],email:r[3],birth:r[4],location:r[5],category:r[6],league:r[7]};break;
      default:throw new Error('Origen sin correspondencia de columnas');
    }
    const explicitStudyValues=p.studyValues;
    p=Object.fromEntries(Object.entries(p).filter(([key])=>key!=='studyValues').map(([key,val])=>[key,clean(val)]));
    if(!p.name || /^(nombre|nombre apellidos|total|porteros)$/i.test(p.name)) continue;
    p.name=p.name.replaceAll(' / ',' ');p.phone=clean(p.phone).replace(/^'/,'');
    const raw={location:p.location||'',province:p.province||'',community:p.community||'',studies:p.studies||'',position:p.position||'',category:p.category||''};
    const geo=geography(p.location,p.province,p.community);
    p={...p,...geo,studies:studies(p.studies),position:position(p.position),year:birthYear(p.birth),category:clean(p.category)?clean(p.category).charAt(0).toUpperCase()+clean(p.category).slice(1).toLowerCase():''};
    const positions=positionValues(raw.position);
    result.push({...p,position:positions.join(' / '),positions,studyValues:explicitStudyValues||unique(clean(raw.studies).split(' / ').map(studies)),raw,id:`${source.id}:${index+1}`,sourceId:source.id,source:source.label,spreadsheetId:source.spreadsheetId,workbook:source.workbook,tab:source.name,row:index+1,gid:source.gid,primary:source.primary});
  }
  return result;
}
export function normalizeDatasets(datasets) {return SOURCES.flatMap(s=>normalizeSource(s,datasets[datasetKey(s)]||[]));}
export function upgradePlayer(player) {
  if(player.sourceId)return player;
  const source=SOURCES.find(s=>s.spreadsheetId===SPREADSHEET_ID&&s.gid===player.gid);
  if(!source)throw new Error('Origen de la copia anterior no reconocido.');
  const positions=positionValues(player.raw?.position||player.position);
  return {...player,id:`${source.id}:${player.row}`,sourceId:source.id,source:source.label,spreadsheetId:source.spreadsheetId,workbook:source.workbook,tab:source.name,positions,position:positions.join(' / '),studyValues:unique(clean(player.raw?.studies||player.studies).split(' / ').map(studies))};
}
