/**
 * 1_Base_Controller.gs
 * Controlador base del Framework GASVEL
 *
 * Los roles ahora se manejan como STRINGS: 'admin', 'mozo', 'cocina',
 * 'cliente', 'totem' (ver CONFIG.ROLES en 0_Config.gs).
 *
 * Cada rol tiene una lista de PERMISOS (columna 'permisos' en la hoja ROLES).
 * Los permisos son strings separados por coma, ej: 'pedidos,mesas'.
 * El admin edita esos permisos desde el panel de Roles con toggles.
 */

class Base_Controller {

  // ==========================================
  // RENDERIZADO
  // ==========================================

  view(viewName, data = {}, layout = 'Layout_Main') {
    return View.render(viewName, data, layout);
  }

  viewStandalone(viewName, data = {}) {
    return View.renderStandalone(viewName, data);
  }

  redirect(routeName) {
    var url = WebApp.url(routeName);
    var html = '<!DOCTYPE html><html><head><base target="_top">' +
      '<meta http-equiv="refresh" content="0; url=' + url + '">' +
      '<script>window.top.location.href = ' + JSON.stringify(url) + ';</script>' +
      '</head><body>Redireccionando...</body></html>';
    return HtmlService.createHtmlOutput(html)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // ==========================================
  // SESIÓN
  // ==========================================

  _getSessionUser() {
    var userProps = PropertiesService.getUserProperties();
    var sessionEmail = userProps.getProperty('userEmail');
    if (!sessionEmail) return null;

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === sessionEmail.toLowerCase();
    });

    if (user) {
      user.rol_id = this._normalizeRole(user.rol_id);
    }

    return user || null;
  }

  _checkAdminPermission() {
    var user = this._getSessionUser();
    return !!user && user.rol_id === CONFIG.ROLES.ADMIN;
  }

  /**
   * @deprecated Usar _hasPermission() en su lugar.
   * Se mantiene para compatibilidad con controladores viejos.
   */
  _checkRolePermission(allowedRoles) {
    var user = this._getSessionUser();
    if (!user) return false;
    return allowedRoles.indexOf(user.rol_id) !== -1;
  }

  // ==========================================
  // PERMISOS (NUEVO)
  // ==========================================

  /**
   * Devuelve el array de permisos del usuario actual.
   * Ej: ['pedidos', 'mesas']
   */
  _getUserPermissions() {
    var user = this._getSessionUser();
    if (!user) return [];

    var rol = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return String(r.rol_id).trim().toLowerCase() === String(user.rol_id).trim().toLowerCase();
    });

    if (!rol || !rol.permisos) return [];

    return String(rol.permisos)
      .split(',')
      .map(function(p) { return p.trim().toLowerCase(); })
      .filter(function(p) { return p; });
  }

  /**
   * true si el usuario actual tiene el permiso indicado.
   * Ej: _hasPermission('pedidos') → true/false
   */
  _hasPermission(permiso) {
    return this._getUserPermissions().indexOf(String(permiso || '').trim().toLowerCase()) !== -1;
  }

  // ==========================================
  // HELPERS DE ROL
  // ==========================================

  _normalizeRole(rolRaw) {
    var v = String(rolRaw === null || rolRaw === undefined ? '' : rolRaw).trim().toLowerCase();

    var validos = Object.keys(CONFIG.ROLES).map(function(k) {
      return CONFIG.ROLES[k];
    });
    if (validos.indexOf(v) !== -1) return v;

    var mapa = {
      '1': CONFIG.ROLES.ADMIN,
      '2': CONFIG.ROLES.MOZO,
      '3': CONFIG.ROLES.COCINA,
      '4': CONFIG.ROLES.CLIENTE,
      '5': CONFIG.ROLES.TOTEM
    };
    if (mapa[v]) return mapa[v];

    return CONFIG.ROLES.CLIENTE;
  }

  _getRoleName(rolId) {
    var key = this._normalizeRole(rolId);
    return CONFIG.ROLE_LABELS[key] || 'Usuario';
  }

  _getRoleBadgeClass(rolId) {
    var key = this._normalizeRole(rolId);
    return CONFIG.ROLE_BADGES[key] || 'badge-secondary';
  }

  /**
   * Datos de sesión listos para el header/sidebar del dashboard.
   * Ahora incluye también el array de PERMISOS del usuario.
   */
  _getDashboardUserData() {
    var user = this._getSessionUser();

    if (!user) {
      return {
        userName: 'Invitado',
        userInitial: 'I',
        userRole: 'Invitado',
        userRoleId: null,
        userPermissions: []
      };
    }

    return {
      userName: user.nombre || 'Usuario',
      userInitial: (user.nombre || 'U').charAt(0).toUpperCase(),
      userRole: this._getRoleName(user.rol_id),
      userRoleId: user.rol_id,
      userPermissions: this._getUserPermissions()   // 👈 NUEVO
    };
  }

  _denyAccess() {
    var user = this._getSessionUser();
    if (!user) return this.redirect('login');

    var permisos = this._getUserPermissions();

    // Redirigir al primer permiso que tenga
    if (permisos.indexOf('pedidos') !== -1) return this.redirect('dashboard/pedidos');
    if (permisos.indexOf('mesas') !== -1) return this.redirect('dashboard/mesas');
    if (permisos.indexOf('productos') !== -1) return this.redirect('dashboard/productos');
    if (permisos.indexOf('categorias') !== -1) return this.redirect('dashboard/categorias');
    if (permisos.indexOf('usuarios') !== -1) return this.redirect('dashboard');
    if (permisos.indexOf('roles') !== -1) return this.redirect('dashboard/roles');
    if (permisos.indexOf('archivo') !== -1) return this.redirect('dashboard/archivo');

    return this.redirect('home');
  }

  // ==========================================
  // RESPUESTAS JSON
  // ==========================================

  jsonResponse(success, message, extra = {}) {
    if (typeof extra === 'string') {
      const routeName = extra;
      extra = {
        url: WebApp.url(routeName),
        redirect: !!routeName,
        route: routeName
      };
    }

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

globalThis.Base_Controller = Base_Controller;
