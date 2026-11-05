function requireOwner_(){
  var email=Session.getActiveUser().getEmail();
  if(!email||email.toLowerCase()!=='antonio8aranda98@gmail.com')throw new Error('Esta app es privada. Inicia sesión con tu cuenta autorizada.');
}
function doGet(){
  requireOwner_();
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Players BD · Tu base privada').addMetaTag('viewport','width=device-width,initial-scale=1');
}
function getWorkbookData(bookId){
  requireOwner_();
  var book=Players_.BOOKS.find(function(b){return b.id===bookId;});
  if(!book)throw new Error('Archivo no autorizado.');
  var workbook=SpreadsheetApp.openById(book.id);
  var sources=Players_.SOURCES.filter(function(s){return s.spreadsheetId===book.id;});
  var players=[];
  sources.forEach(function(source){
    var sheet=workbook.getSheetByName(source.name);
    if(!sheet)throw new Error('Falta la pestaña '+source.name+'. Se conserva la lectura anterior.');
    var lastRow=sheet.getLastRow();
    var lastColumn=sheet.getLastColumn();
    var rows=lastRow&&lastColumn?sheet.getRange(1,1,lastRow,lastColumn).getDisplayValues():[];
    var normalized=Players_.normalizeSource(source,rows);
    players=players.concat(normalized);
  });
  return JSON.stringify({spreadsheetId:book.id,players:players,fetchedAt:new Date().toISOString()});
}
