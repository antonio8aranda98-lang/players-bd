export const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
export const fold = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const REGIONS = [
  ['Galicia',0,1,'GA'],['Asturias',1,0,'AS'],['Cantabria',2,0,'CB'],['País Vasco',3,0,'PV'],['Navarra',4,0,'NA'],
  ['La Rioja',3,1,'RI'],['Castilla y León',1,2,'CL'],['Aragón',4,2,'AR'],['Cataluña',5,1,'CT'],
  ['Madrid',2,3,'MD'],['Extremadura',0,4,'EX'],['Castilla-La Mancha',3,4,'CM'],['Comunitat Valenciana',5,3,'VC'],
  ['Illes Balears',6,3,'IB'],['Andalucía',2,5,'AN'],['Murcia',4,5,'MC'],['Canarias',0,6,'CN'],['Ceuta',2,6,'CE'],['Melilla',3,6,'ML']
];
const provinceRegions = {
  'A Coruña':'Galicia','Lugo':'Galicia','Ourense':'Galicia','Pontevedra':'Galicia','Asturias':'Asturias','Cantabria':'Cantabria',
  'Álava':'País Vasco','Bizkaia':'País Vasco','Gipuzkoa':'País Vasco','Navarra':'Navarra','La Rioja':'La Rioja',
  'Ávila':'Castilla y León','Burgos':'Castilla y León','León':'Castilla y León','Palencia':'Castilla y León','Salamanca':'Castilla y León','Segovia':'Castilla y León','Soria':'Castilla y León','Valladolid':'Castilla y León','Zamora':'Castilla y León',
  'Huesca':'Aragón','Teruel':'Aragón','Zaragoza':'Aragón','Barcelona':'Cataluña','Girona':'Cataluña','Lleida':'Cataluña','Tarragona':'Cataluña',
  'Madrid':'Madrid','Badajoz':'Extremadura','Cáceres':'Extremadura','Albacete':'Castilla-La Mancha','Ciudad Real':'Castilla-La Mancha','Cuenca':'Castilla-La Mancha','Guadalajara':'Castilla-La Mancha','Toledo':'Castilla-La Mancha',
  'Alicante':'Comunitat Valenciana','Castellón':'Comunitat Valenciana','Valencia':'Comunitat Valenciana','Illes Balears':'Illes Balears','Murcia':'Murcia',
  'Almería':'Andalucía','Cádiz':'Andalucía','Córdoba':'Andalucía','Granada':'Andalucía','Huelva':'Andalucía','Jaén':'Andalucía','Málaga':'Andalucía','Sevilla':'Andalucía',
  'Las Palmas':'Canarias','Santa Cruz de Tenerife':'Canarias','Ceuta':'Ceuta','Melilla':'Melilla'
};
const provinceLookup = Object.fromEntries(Object.keys(provinceRegions).map(p=>[fold(p),p]));
const provinceAliases = {'alacant':'Alicante','castello':'Castellón','castellon de la plana':'Castellón','gerona':'Girona','lerida':'Lleida','vizcaya':'Bizkaia','guipuzcoa':'Gipuzkoa','araba':'Álava','la coruna':'A Coruña','coruna':'A Coruña','orense':'Ourense','baleares':'Illes Balears','islas baleares':'Illes Balears'};
const cities = {
  'leganes':'Madrid','getafe':'Madrid','las rozas':'Madrid','las rozas de madrid':'Madrid','alcala de henares':'Madrid','alcorcon':'Madrid','fuenlabrada':'Madrid','mostoles':'Madrid','parla':'Madrid','alcobendas':'Madrid','paracuellos de jarama':'Madrid','rivas vaciamadrid':'Madrid','san sebastian de los reyes':'Madrid','torrejon de ardoz':'Madrid','pozuelo de alarcon':'Madrid','collado villalba':'Madrid',
  'san vicente del raspeig':'Alicante','san vicente del raspeig / sant vicent del raspeig':'Alicante','elche':'Alicante','elda':'Alicante','benidorm':'Alicante','barbera del valles':'Barcelona','hospitalet de llobregat':'Barcelona','terrassa':'Barcelona','sabadell':'Barcelona','badalona':'Barcelona','mataro':'Barcelona','vitoria-gasteiz':'Álava','vitoria':'Álava','bilbao':'Bizkaia','donostia':'Gipuzkoa','san sebastian':'Gipuzkoa','pamplona':'Navarra','logrono':'La Rioja','gijon':'Asturias','oviedo':'Asturias','santander':'Cantabria','santiago de compostela':'A Coruña','vigo':'Pontevedra','jerez de la frontera':'Cádiz','marbella':'Málaga','cartagena':'Murcia','san cristobal de la laguna':'Santa Cruz de Tenerife','santa cruz de tenerife':'Santa Cruz de Tenerife','las palmas de gran canaria':'Las Palmas','palma':'Illes Balears','palma de mallorca':'Illes Balears','ibiza':'Illes Balears'
};
const regionAliases = {'comunidad de madrid':'Madrid','comunidad valenciana':'Comunitat Valenciana','comunitat valenciana':'Comunitat Valenciana','catalunya':'Cataluña','castilla la mancha':'Castilla-La Mancha','castilla y leon':'Castilla y León','andalucia':'Andalucía','principado de asturias':'Asturias','region de murcia':'Murcia','islas canarias':'Canarias','pais vasco':'País Vasco','euskadi':'País Vasco','comunidad foral de navarra':'Navarra'};
for (const [name] of REGIONS) regionAliases[fold(name)] = name;
export function geography(location, province = '', community = '') {
  const candidates = [province, location].map(fold).filter(Boolean);
  const found = candidates.map(s=>provinceLookup[s]||provinceAliases[s]||cities[s]).find(Boolean)||'';
  const region = (found && provinceRegions[found]) || [community, province, location].map(s=>regionAliases[fold(s)]).find(Boolean) || '';
  return {province:found, community:region};
}
export function studies(value) {
  const s=fold(value);
  if (/^(1|primero|primer)\s*(\.|o|º|°|er|ro|ero)?\s*(de\s*)?(bach|bachiller)/.test(s)) return '1.º Bachillerato';
  if (/^(2|segundo)\s*(\.|o|º|°|do)?\s*(de\s*)?(bach|bachiller)/.test(s)) return '2.º Bachillerato';
  if (s==='eso'||/^[1-4].*eso$/.test(s)) return 'ESO';
  if (/universidad|universitari/.test(s)) return 'Universidad';
  if (/grado superior|fp superior/.test(s)&&!/^nada/.test(s)) return 'Grado superior';
  if (/grado medio|fp medio/.test(s)) return 'Grado medio';
  return clean(value);
}
export function position(value) {
  const s=fold(value).replace(/[.,]/g,'');
  const aliases={por:'Portero',pt:'Portero',portero:'Portero',portera:'Portero',gk:'Portero',mc:'Mediocentro',mediocentro:'Mediocentro',mp:'Mediapunta',mco:'Mediapunta',mediapunta:'Mediapunta',mcd:'Mediocentro defensivo',ld:'Lateral derecho',li:'Lateral izquierdo',dfc:'Central',central:'Central',dc:'Delantero',delantero:'Delantero','ext der':'Extremo derecho','ext izq':'Extremo izquierdo',ed:'Extremo derecho',ei:'Extremo izquierdo'};
  if(s==='defensa central')return 'Central';
  if(s==='extremo')return 'Extremo';
  if(s==='ext')return 'Extremo';
  return aliases[s]||clean(value);
}
export function birthYear(value) {
  const s=clean(value);
  // A year bucket such as «2006 o mayor» is not an exact birth year.
  if (/^\d{4}$/.test(s)) {const n=Number(s); return n>=1940&&n<=new Date().getFullYear()?s:'';}
  const m=s.match(/^(\d{4})-\d{2}-\d{2}/)||s.match(/^\d{1,2}[/-]\d{1,2}[/-](\d{4})$/);
  return m&&Number(m[1])>=1940&&Number(m[1])<=new Date().getFullYear()?m[1]:'';
}
export function matches(p, filters={}) {
  if (filters.q && !fold([p.name,p.email,p.phone,p.location,p.province,p.community,p.club].join(' ')).includes(fold(filters.q))) return false;
  for(const key of ['community','province','studies','position','category','year','workbook','source']) {
    const value=filters[key];
    const candidates=key==='position'?(p.positions||[p.position]):key==='studies'?(p.studyValues||[p.studies]):[p[key]];
    if(value && (value==='__missing' ? candidates.some(Boolean) : !candidates.includes(value))) return false;
  }
  return true;
}
export const filteredPlayers = (players,filters) => players.filter(p=>matches(p,filters));
