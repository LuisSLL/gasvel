/**
 * 9_Routes.gs
 * Router simplificado
 */

var __ROUTES__ = {
  GET: {},
  POST: {}
};

class Route {
  static get(path, target) { __ROUTES__.GET[path] = target; }
  static post(path, target) { __ROUTES__.POST[path] = target; }
  static find(path, method) {
    return __ROUTES__[method] ? __ROUTES__[method][path] : null;
  }
  static findWithParams(path, method) {
    var routes = __ROUTES__[method] || {};
    for (var routePattern in routes) {
      if (routes.hasOwnProperty(routePattern)) {
        var target = routes[routePattern];
        var regexPattern = routePattern.replace(/\//g, '\\/').replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '(?<$1>[^/]+)');
        var regex = new RegExp('^' + regexPattern + '$');
        var match = path.match(regex);
        if (match) {
          var params = match.groups || {};
          return { target: target, params: params };
        }
      }
    }
    return null;
  }
}

var Router = {
  resolve: function(e, method) {
    try {
      if (!e) e = { parameter: {} };
      if (!e.parameter) e.parameter = {};
      
      var routePath = e.parameter.p || e.parameter.route || 'home';
      Logger.log('🔍 Router: ' + method + ' ' + routePath);
      
      var target = Route.find(routePath, method);
      var params = {};
      
      if (!target) {
        var result = Route.findWithParams(routePath, method);
        if (result) { target = result.target; params = result.params; }
      }
      
      if (!target) {
        Logger.log('⚠️ Ruta no encontrada: ' + routePath);
        return HtmlService.createHtmlOutput('<h1>404 - Página no encontrada</h1><a href="?p=home">Volver</a>');
      }
      
      var parts = target.split('@');
      var controllerName = parts[0];
      var methodName = parts[1];
      
      var controllerClass = globalThis['Ctrl_' + controllerName];
      if (!controllerClass) {
        return HtmlService.createHtmlOutput('<h1>Error: Controlador no encontrado</h1>');
      }
      
      // 🆕 CORRECCIÓN DEFINITIVA: Si es una clase (typeof function), usamos new.
      // Si es un objeto literal, usamos Object.create.
      var instance;
      if (typeof controllerClass === 'function') {
        instance = new controllerClass();
      } else {
        instance = Object.create(controllerClass);
      }
      
      if (typeof instance[methodName] !== 'function') {
        return HtmlService.createHtmlOutput('<h1>Error: Método no encontrado</h1>');
      }
      
      var allParams = {};
      for (var key in params) allParams[key] = params[key];
      for (var key in e.parameter) allParams[key] = e.parameter[key];
      
      var result = instance[methodName](allParams);
      
      if (result && typeof result.getContent === 'function') return result;
      if (typeof result === 'string') return HtmlService.createHtmlOutput(result);
      if (typeof result === 'object') {
        return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
      }
      
      return HtmlService.createHtmlOutput(String(result));
      
    } catch (error) {
      Logger.log('❌ Error: ' + error.message);
      return HtmlService.createHtmlOutput('<h1>Error: ' + error.message + '</h1>');
    }
  }
};

// ==========================================
// Rutas Públicas (Home)
// ==========================================
Route.get('', 'Home@index');
Route.get('home', 'Home@index');
Route.post('pedido/crear', 'Home@crearPedido');

// ==========================================
// Rutas de Autenticación y Dashboard
// ==========================================
Route.get('login', 'Auth@showLogin');
Route.post('login', 'Auth@login');
Route.get('registro', 'Auth@showRegister');
Route.post('registro', 'Auth@register');
Route.get('dashboard', 'Auth@showDashboard');
Route.post('dashboard/crear', 'Auth@createUser');
Route.get('logout', 'Auth@logout');

// ==========================================
// ✅ RUTAS DE CATEGORÍAS (AGREGADAS)
// ==========================================
Route.get('dashboard/categorias', 'Categorias@index');
Route.post('categorias/crear', 'Categorias@create');
Route.post('categorias/editar', 'Categorias@update');
Route.post('categorias/eliminar', 'Categorias@delete');

globalThis.Route = Route;
globalThis.Router = Router;
globalThis.__ROUTES__ = __ROUTES__;

Logger.log('✅ Router cargado');
