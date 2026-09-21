/**
 * 2_Base_Model.gs
 * Modelo base extendido para CRUD completo
 */
class Base_Model {

  static getSpreadsheet(){
    if(CONFIG.SPREADSHEET_ID){
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  static sheet(sheetName){
    var ss = this.getSpreadsheet();
    return ss.getSheetByName(sheetName);
  }

  static all(sheetName){
    var sheet = this.sheet(sheetName);
    if (!sheet) return [];
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return [];
    var headers = data.shift();
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = data[i][j];
      }
      result.push(obj);
    }
    return result;
  }

  static create(sheetName, dataObj) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var rowToInsert = [];
    for (var i = 0; i < headers.length; i++) {
      var h = headers[i];
      rowToInsert.push(dataObj.hasOwnProperty(h) ? dataObj[h] : "");
    }
    sheet.appendRow(rowToInsert);
    return true;
  }

  /**
   * ACTUALIZAR: Busca por ID y sobreescribe los datos
   */
  static update(sheetName, id, dataObj) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return false;
    var headers = data[0];
    
    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) {
      console.error("No se encontró el ID:", id);
      return false;
    }

    var newRowValues = [];
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      newRowValues.push(dataObj.hasOwnProperty(header) ? dataObj[header] : data[rowIndex][i]);
    }

    sheet.getRange(rowIndex + 1, 1, 1, headers.length).setValues([newRowValues]);
    return true;
  }

  static delete(sheetName, id) {
    var sheet = this.sheet(sheetName);
    if (!sheet) return false;
    var data = sheet.getDataRange().getValues();
    if (data.length === 0) return false;
    
    var rowIndex = -1;
    for (var i = 0; i < data.length; i++) {
      if (data[i][0].toString().trim() === id.toString().trim()) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex !== -1) {
      sheet.deleteRow(rowIndex + 1);
      return true;
    }
    return false;
  }

  static getLastId(sheetName) {
    var data = this.all(sheetName);
    if (data.length === 0) return 0;
    var maxId = 0;
    for (var i = 0; i < data.length; i++) {
      var id = parseInt(data[i][Object.keys(data[i])[0]]) || 0;
      if (id > maxId) maxId = id;
    }
    return maxId;
  }

  static getNextId(sheetName) {
    return this.getLastId(sheetName) + 1;
  }
}

// Registrar global
globalThis.Base_Model = Base_Model;

Logger.log('✅ Base_Model cargado correctamente');
