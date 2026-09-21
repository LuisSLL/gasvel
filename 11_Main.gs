/**
 * 11_Main.gs - Punto de entrada
 */

function doGet(e) { 
  try {
    if (!e) e = { parameter: {} };
    var result = Router.resolve(e, 'GET');
    if (result && typeof result.getContent === 'function') return result;
    return HtmlService.createHtmlOutput(String(result));
  } catch (error) {
    return HtmlService.createHtmlOutput('<h1>Error: ' + error.message + '</h1>');
  }
}

function doPost(e) { 
  try {
    if (!e) e = { parameter: {} };
    var result = Router.resolve(e, 'POST');
    if (result && typeof result.getContent === 'function') return result;
    return HtmlService.createHtmlOutput(String(result));
  } catch (error) {
    return HtmlService.createHtmlOutput('<h1>Error: ' + error.message + '</h1>');
  }
}

function ejecutarController(ruta, params) {
  try {
    if (!ruta) throw new Error("Ruta no especificada");
    var parts = ruta.split('@');
    if (parts.length !== 2) throw new Error("Formato inválido");
    
    var controllerName = parts[0];
    var methodName = parts[1];
    var controllerClass = globalThis['Ctrl_' + controllerName];
    
    if (!controllerClass) throw new Error("Controller no encontrado");
    var instance = new controllerClass();
    if (typeof instance[methodName] !== 'function') throw new Error("Método no existe");
    
    var res = instance[methodName](params || {});
    if (res && !res.message && res.error) res.message = res.error;
    return res;
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

Logger.log('🚀 GASVEL iniciado');
