/**
 * 10_Helpers.gs - Funciones de utilidad global
 */

// --- UTILIDADES DE RUTA (WebApp) ---

const WebApp = {
  url: function(routeName) {
    const baseUrl = ScriptApp.getService().getUrl();
    return routeName ? `${baseUrl}?p=${routeName}` : baseUrl;
  },
  
  asset: function(path) {
    const baseUrl = ScriptApp.getService().getUrl();
    return `${baseUrl}?asset=${path}`;
  }
};

globalThis.WebApp = WebApp;

// --- FORMATEO DE DATOS ---

function formatDate(date) {
  if (!date || !(date instanceof Date)) return date;
  const day = ("0" + date.getDate()).slice(-2);
  const month = ("0" + (date.getMonth() + 1)).slice(-2);
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '$ 0.00';
  return '$ ' + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

globalThis.formatDate = formatDate;
globalThis.formatCurrency = formatCurrency;

// --- FUNCIÓN PARA CREAR ADMIN DE PRUEBA ---

function crearAdminConocido() {
  var pass = "admin123";
  var hash = User_Model.hashPassword(pass);
  
  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.DB.USERS);
  
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(CONFIG.DB.USERS);
    sheet.appendRow(['user_id', 'nombre', 'apellido', 'email', 'telefono', 'wpp', 'rol_id', 'pass_hash', 'activo', 'fecha_registro']);
  }

  var nextId = Base_Model.getNextId(CONFIG.DB.USERS);

  sheet.appendRow([
    nextId,
    "Admin",
    "Prueba",
    "nuevo_admin@test.com",
    "555-0000",
    "555-0000",
    1, // Admin
    hash,
    true,
    new Date()
  ]);
  
  Logger.log("✅ Admin creado: nuevo_admin@test.com / admin123");
}

globalThis.crearAdminConocido = crearAdminConocido;

// --- TEMA (DARK / LIGHT) ---

function getTheme() {
  var props = PropertiesService.getScriptProperties();
  var theme = props.getProperty('theme');
  if (!theme) return 'dark';
  return theme;
}

function setTheme(theme) {
  if (theme !== 'dark' && theme !== 'light') {
    theme = 'dark';
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty('theme', theme);
  return theme;
}

globalThis.getTheme = getTheme;
globalThis.setTheme = setTheme;

// --- CERRAR SESIÓN EN SERVIDOR ---

function cerrarSesionServidor() {
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteAllProperties();
  return { success: true };
}

globalThis.cerrarSesionServidor = cerrarSesionServidor;

// --- FUNCIONES DE PRUEBA ---

function probarTodo() {
  var users = Base_Model.all(CONFIG.DB.USERS);
  Logger.log("👥 Usuarios encontrados: " + users.length);
  
  var user2 = users.find(function(u) {
    return String(u.user_id).trim() === "2";
  });
  Logger.log("📦 Usuario 2:", user2);
}

globalThis.probarTodo = probarTodo;

function probarConID() {
  var users = Base_Model.all(CONFIG.DB.USERS);
  
  users.forEach(function(u) {
    Logger.log("✅ Usuario ID: " + u.user_id + " - Nombre: " + u.nombre);
  });
  
  if (users.length > 0) {
    var primerID = users[0].user_id;
    Logger.log("🔍 Probando con user_id: " + primerID);
    
    var controller = new Ctrl_Auth();
    var resultado = controller.getUserById({ user_id: primerID });
    Logger.log("📦 Resultado:", resultado);
  }
}

globalThis.probarConID = probarConID;

// --- FUNCIÓN PARA PROBAR getUserById ---

function probarGetUserFinal() {
  var controller = new Ctrl_Auth();
  var resultado = controller.getUserById({ user_id: 1 });
  Logger.log("📦 RESULTADO COMPLETO: " + JSON.stringify(resultado));
}

globalThis.probarGetUserFinal = probarGetUserFinal;
