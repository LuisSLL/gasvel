/**
 * 1_Base_Controller.gs
 * Controlador base del Framework GASVEL
 */

class Base_Controller {

  /**
   * Renderizado con Layout
   *
   * @param {string} viewName
   * @param {Object} data
   * @param {string} layout
   */
  view(viewName, data = {}, layout = 'Layout_Main') {
    return View.render(viewName, data, layout);
  }

  /**
   * Renderizado SIN layout (páginas standalone, ej: ticket de cocina
   * pensado para imprimirse desde una pestaña propia).
   */
  viewStandalone(viewName, data = {}) {
    return View.renderStandalone(viewName, data);
  }


  /**
   * Redirección HTTP simple vía meta-refresh / JS.
   * Se usa en controladores cuando no hay sesión o el rol no tiene permiso.
   *
   * @param {string} routeName - nombre de ruta (ej: 'login', 'dashboard')
   */
  redirect(routeName) {
    var url = WebApp.url(routeName);
    var html = '<!DOCTYPE html><html><head><base target="_top">' +
      '<meta http-equiv="refresh" content="0; url=' + url + '">' +
      '<script>window.top.location.href = ' + JSON.stringify(url) + ';</script>' +
      '</head><body>Redireccionando...</body></html>';
    return HtmlService.createHtmlOutput(html)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }


  /**
   * Genera una respuesta JSON estándar
   *
   * @param {boolean} success
   * @param {string} message
   * @param {Object|string} extra
   */
  /**
   * Devuelve el usuario de la sesión activa (o null si no hay sesión).
   */
  _getSessionUser() {
    var userProps = PropertiesService.getUserProperties();
    var sessionEmail = userProps.getProperty('userEmail');
    if (!sessionEmail) return null;

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === sessionEmail.toLowerCase();
    });

    return user || null;
  }

  /**
   * true si hay sesión activa y el usuario es ADMIN (rol_id 1)
   */
  _checkAdminPermission() {
    var user = this._getSessionUser();
    return !!user && parseInt(user.rol_id) === CONFIG.ROLES.ADMIN;
  }

  /**
   * true si hay sesión activa y el rol del usuario está entre los permitidos.
   * @param {number[]} allowedRoleIds
   */
  _checkRolePermission(allowedRoleIds) {
    var user = this._getSessionUser();
    if (!user) return false;
    return allowedRoleIds.indexOf(parseInt(user.rol_id)) !== -1;
  }

  /**
   * Datos de sesión listos para el header/sidebar del dashboard.
   * Centraliza esto para no repetir stubs hardcodeados ("Admin", "A") en
   * cada controlador de módulo.
   */
  _getDashboardUserData() {
    var user = this._getSessionUser();

    if (!user) {
      return { userName: 'Invitado', userInitial: 'I', userRole: 'Invitado', userRoleId: null };
    }

    var roleNames = {};
    roleNames[CONFIG.ROLES.ADMIN] = 'Admin';
    roleNames[CONFIG.ROLES.MOZO] = 'Mozo';       // 👈 antes decía CAJA (no existía)
    roleNames[CONFIG.ROLES.COCINA] = 'Cocina';
    roleNames[CONFIG.ROLES.CLIENTE] = 'Cliente';
    roleNames[CONFIG.ROLES.TOTEM] = 'Invitado';  // 👈 NUEVO

    var roleId = parseInt(user.rol_id);

    return {
      userName: user.nombre || 'Usuario',
      userInitial: (user.nombre || 'U').charAt(0).toUpperCase(),
      userRole: roleNames[roleId] || 'Usuario',
      userRoleId: roleId
    };
  }

  /**
   * Redirige a un usuario sin permiso a una página que SÍ pueda ver, en vez
   * de mandarlo siempre a 'login' (lo cual, si ya tiene sesión activa, se ve
   * exactamente como si se hubiera cerrado sesión y genera confusión).
   * Solo va a 'login' cuando realmente no hay sesión.
   */
  _denyAccess() {
    var user = this._getSessionUser();

    if (!user) {
      return this.redirect('login');
    }

    var roleId = parseInt(user.rol_id);
    var fallbackRoute = 'home';

    if (roleId === CONFIG.ROLES.ADMIN) {
      fallbackRoute = 'dashboard';
    } else if (roleId === CONFIG.ROLES.CAJA || roleId === CONFIG.ROLES.COCINA) {
      fallbackRoute = 'dashboard/pedidos';
    }

    return this.redirect(fallbackRoute);
  }

  jsonResponse(success, message, extra = {}) {

    // Si extra es un string,
    // lo tratamos como nombre de ruta.
    if (typeof extra === 'string') {

      const routeName = extra;

      extra = {
        url: WebApp.url(routeName),
        redirect: !!routeName,
        route: routeName
      };
    }


    // Refrescar la URL actual
    if (success && !extra.url && extra.refresh) {
      extra.url = WebApp.url();
    }


    return {
      success: success,
      message: message,
      timestamp: new Date().getTime(),
      ...extra
    };
  }
}


// Registro global
globalThis.Base_Controller = Base_Controller;
