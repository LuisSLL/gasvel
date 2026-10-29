/**
 * Controlador de Autenticación y Dashboard
 * Archivo: 12_Ctrl_Auth.gs
 * Extiende Base_Controller
 *
 * Roles ahora son STRINGS: 'admin', 'mozo', 'cocina', 'cliente', 'totem'.
 * La redirección post-login se basa en PERMISOS (no en rol).
 */

class Ctrl_Auth extends Base_Controller {

  // ==========================================
  // 1. VISTAS PÚBLICAS
  // ==========================================

  showLogin(params) {
    Logger.log('==> [Ctrl_Auth.showLogin] Renderizando vista Login...');

    var allowedNext = ['home'];
    var next = (params && params.next && allowedNext.indexOf(params.next) !== -1) ? params.next : '';

    return this.view('Login', {
      title: "Iniciar Sesión",
      nextRoute: next
    }, 'Layout_Login');
  }

  login(data) {
    Logger.log('==> [Ctrl_Auth.login] Petición recibida con payload: ' + JSON.stringify(data ? { email: data.email, passLength: data.password ? data.password.length : 0 } : null));

    if (!data || !data.email || !data.password) {
      return {
        success: false,
        message: 'Por favor, ingresa tu correo y contraseña.'
      };
    }

    var email = data.email.toString().trim().toLowerCase();
    var pass = data.password.toString();

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === email;
    });

    if (user && (user.activo === true || user.activo.toString().toUpperCase() === 'TRUE')) {
      var hashedInput = User_Model.hashPassword(pass);

      if (user.pass_hash === hashedInput) {
        var rolStr = String(user.rol_id || '').trim().toLowerCase();

        var userProps = PropertiesService.getUserProperties();
        userProps.setProperty('userEmail', email);
        userProps.setProperty('userId', user.user_id.toString());
        userProps.setProperty('userRole', rolStr);
        userProps.setProperty('isGuest', 'false');

        var userData = {
          id: user.user_id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          rol_id: rolStr
        };

        // ✅ REDIRECCIÓN SEGÚN PERMISOS
        var baseUrl = getWebAppUrl();
        var redirectUrl = this._getRedirectUrlByPermissions_(baseUrl, rolStr);

        // ?next=home override
        var allowedNext = ['home'];
        if (data.next && allowedNext.indexOf(data.next) !== -1) {
          redirectUrl = baseUrl + '?p=' + data.next;
        }

        Logger.log('<== [Ctrl_Auth.login] Autenticado. Redirigiendo a: ' + redirectUrl);
        return {
          success: true,
          message: '¡Login exitoso!',
          user: userData,
          url: redirectUrl
        };
      } else {
        return {
          success: false,
          message: 'La contraseña es incorrecta.'
        };
      }
    } else {
      return {
        success: false,
        message: 'Usuario no encontrado o inactivo.'
      };
    }
  }

  loginAsGuest() {
    Logger.log('==> [Ctrl_Auth.loginAsGuest] Iniciando sesión de invitado...');

    var guestEmail = CONFIG.GUEST.EMAIL;
    var guestUser = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === guestEmail.toLowerCase();
    });

    if (!guestUser) {
      return {
        success: false,
        message: 'El modo invitado no está disponible. Avisá al personal.'
      };
    }

    var userProps = PropertiesService.getUserProperties();
    userProps.setProperty('userEmail', guestEmail);
    userProps.setProperty('userId', CONFIG.GUEST.USER_ID.toString());
    userProps.setProperty('userRole', CONFIG.GUEST.ROL_ID);
    userProps.setProperty('isGuest', 'true');

    var baseUrl = getWebAppUrl();

    return {
      success: true,
      message: '¡Listo! Ya podés ordenar.',
      user: {
        id: CONFIG.GUEST.USER_ID,
        nombre: CONFIG.GUEST.NOMBRE,
        rol_id: CONFIG.GUEST.ROL_ID,
        isGuest: true
      },
      url: baseUrl + '?p=home'
    };
  }

  showRegister() {
    return this.view('Register', {
      title: "Registro de Usuario"
    }, 'Layout_Login');
  }

  register(data) {
    if (!data || !data.email || !data.password || !data.name) {
      return {
        success: false,
        message: 'Nombre, correo y contraseña son obligatorios.'
      };
    }

    var cleanEmail = data.email.toString().trim().toLowerCase();

    var existingUser = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === cleanEmail;
    });

    if (existingUser) {
      return {
        success: false,
        message: 'Este correo ya se encuentra registrado.'
      };
    }

    var nextId = Base_Model.getNextId(CONFIG.DB.USERS);
    var newUser = {
      user_id: nextId,
      nombre: data.name.toString().trim(),
      apellido: data.lastName ? data.lastName.toString().trim() : '',
      email: cleanEmail,
      telefono: data.phone ? data.phone.toString().trim() : '',
      wpp: data.whatsapp ? data.whatsapp.toString().trim() : '',
      rol_id: CONFIG.ROLES.CLIENTE,
      pass_hash: User_Model.hashPassword(data.password),
      activo: true,
      fecha_registro: new Date()
    };

    Base_Model.create(CONFIG.DB.USERS, newUser);

    return {
      success: true,
      message: '¡Registro exitoso! Ya puedes iniciar sesión.',
      url: getWebAppUrl() + '?p=login'
    };
  }

  // ==========================================
  // 2. DASHBOARD
  // ==========================================

  showDashboard() {
    if (!this._hasPermission('usuarios') && !this._checkAdminPermission()) {
      return this._denyAccess();
    }

    var self = this;
    var usersConRol = Base_Model.all(CONFIG.DB.USERS).map(function(u) {
      return Object.assign({}, u, {
        rol_nombre: self._getRoleName(u.rol_id),
        rol_badge:  self._getRoleBadgeClass(u.rol_id)
      });
    });

    return this.view('Dashboard', Object.assign({
      title: "Gestión del Sistema",
      activeMenu: "usuarios",
      users: usersConRol
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  createUser(data) {
    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    if (!data || !data.email || (!data.name && !data.nombre)) {
      return { success: false, message: 'Nombre y correo electrónico son obligatorios.' };
    }

    var cleanEmail = data.email.toString().trim().toLowerCase();
    var existing = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === cleanEmail;
    });

    if (existing) {
      return {
        success: false,
        message: 'El correo especificado ya pertenece a un usuario registrado.'
      };
    }

    var rolRaw = data.roleId || data.rol_id || CONFIG.ROLES.CLIENTE;
    var rolStr = this._normalizeRole(rolRaw);

    var nextId = Base_Model.getNextId(CONFIG.DB.USERS);
    var newUser = {
      user_id: nextId,
      nombre: (data.name || data.nombre).toString().trim(),
      apellido: (data.lastName || data.apellido || '').toString().trim(),
      email: cleanEmail,
      telefono: (data.phone || data.telefono || '').toString().trim(),
      wpp: (data.whatsapp || data.wpp || '').toString().trim(),
      rol_id: rolStr,
      pass_hash: User_Model.hashPassword(data.password || '123456'),
      activo: true,
      fecha_registro: new Date()
    };

    Base_Model.create(CONFIG.DB.USERS, newUser);

    // 👇 Devolver el usuario creado (sin pass_hash) para pintarlo en vivo
    return {
      success: true,
      message: 'Usuario creado exitosamente.',
      user: {
        user_id: newUser.user_id,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        email: newUser.email,
        telefono: newUser.telefono,
        wpp: newUser.wpp,
        rol_id: newUser.rol_id
      }
    };
  }

  logout() {
    var userProps = PropertiesService.getUserProperties();
    userProps.deleteAllProperties();
    return this.redirect('login');
  }

  // ==========================================
  // 3. CRUD DE USUARIOS
  // ==========================================

  getUserById(data) {
    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    var targetId = null;
    if (typeof data === 'object' && data !== null) {
      targetId = data.user_id || data.id;
    } else {
      targetId = data;
    }

    if (targetId === null || targetId === undefined || String(targetId).trim() === '') {
      return { success: false, message: 'ID de usuario no especificado.' };
    }

    var searchIdStr = String(targetId).trim();
    var allUsers = Base_Model.all(CONFIG.DB.USERS);
    var user = allUsers.find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === searchIdStr;
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    user.rol_id = this._normalizeRole(user.rol_id);
    return { success: true, user: user };
  }

  updateUser(data) {
    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    if (!data || (!data.user_id && !data.id)) {
      return { success: false, message: 'ID de usuario inválido.' };
    }

    var targetId = String(data.user_id || data.id).trim();
    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === targetId;
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado para actualizar.' };
    }

    var rolRaw = (data.roleId || data.rol_id) ? (data.roleId || data.rol_id) : user.rol_id;
    var rolStr = this._normalizeRole(rolRaw);

    var updatedUser = {
      user_id: user.user_id,
      nombre: data.nombre !== undefined ? data.nombre : user.nombre,
      apellido: data.apellido !== undefined ? data.apellido : user.apellido,
      email: data.email !== undefined ? data.email : user.email,
      telefono: data.telefono !== undefined ? data.telefono : user.telefono,
      wpp: data.wpp !== undefined ? data.wpp : user.wpp,
      rol_id: rolStr,
      pass_hash: (data.password && data.password.toString().trim() !== '') ? User_Model.hashPassword(data.password) : user.pass_hash,
      activo: user.activo,
      fecha_registro: user.fecha_registro
    };

    Base_Model.update(CONFIG.DB.USERS, user.user_id, updatedUser);

    // 👇 Devolver el usuario actualizado (sin pass_hash)
    return {
      success: true,
      message: '¡Usuario actualizado exitosamente!',
      user: {
        user_id: updatedUser.user_id,
        nombre: updatedUser.nombre,
        apellido: updatedUser.apellido,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        wpp: updatedUser.wpp,
        rol_id: updatedUser.rol_id
      }
    };
  }

  deleteUser(data) {
    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    var targetId = null;
    if (typeof data === 'object' && data !== null) {
      targetId = data.user_id || data.id;
    } else {
      targetId = data;
    }

    if (!targetId) {
      return { success: false, message: 'ID de usuario no especificado.' };
    }

    var searchIdStr = String(targetId).trim();
    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === searchIdStr;
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado.' };
    }

    Base_Model.delete(CONFIG.DB.USERS, user.user_id);

    // 👇 Devolver user_id para saber qué fila borrar
    return {
      success: true,
      message: '¡Usuario eliminado exitosamente!',
      user_id: user.user_id
    };
  }

  // ==========================================
  // 4. HELPERS PRIVADOS
  // ==========================================

  /**
   * ✅ Devuelve la URL de redirección según los permisos del rol.
   * Prioriza por orden lógico.
   */
  _getRedirectUrlByPermissions_(baseUrl, rolId) {
    var rol = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return String(r.rol_id).trim().toLowerCase() === String(rolId).trim().toLowerCase();
    });

    if (!rol || !rol.permisos) {
      return baseUrl + '?p=home';
    }

    var permisos = String(rol.permisos)
      .split(',')
      .map(function(p) { return p.trim().toLowerCase(); })
      .filter(function(p) { return p; });

    var rutas = {
      'pedidos':      '?p=dashboard/pedidos',
      'mesas':        '?p=dashboard/mesas',
      'productos':    '?p=dashboard/productos',
      'categorias':   '?p=dashboard/categorias',
      'usuarios':     '?p=dashboard',
      'roles':        '?p=dashboard/roles',
      'caja':         '?p=dashboard/caja',        // 👈 NUEVO
      'archivo':      '?p=dashboard/archivo',
      'facturacion':  '?p=dashboard/facturacion',
      'configuracion':'?p=dashboard/configuracion'
    };

    for (var i = 0; i < Object.keys(rutas).length; i++) {
      var key = Object.keys(rutas)[i];
      if (permisos.indexOf(key) !== -1) {
        Logger.log('   🔀 Redirigiendo por permiso: ' + key);
        return baseUrl + rutas[key];
      }
    }

    return baseUrl + '?p=home';
  }

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
}

// Registro global
globalThis.Ctrl_Auth = Ctrl_Auth;

// ==========================================
// FUNCIONES PUENTE
// ==========================================

function login(data) {
  if (!data) data = {};
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.login(data));
}

function loginAsGuest() {
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.loginAsGuest());
}

function register(data) {
  if (!data) data = {};
  if (!data.password) data.password = '123456';
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.register(data));
}

function createUser(data) {
  if (!data) data = {};
  if (!data.password) data.password = '123456';
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.createUser(data));
}

function getUserById(data) {
  if (!data) data = {};
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.getUserById(data));
}

function updateUser(data) {
  if (!data) data = {};
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.updateUser(data));
}

function deleteUser(data) {
  if (!data) data = {};
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.deleteUser(data));
}

function cerrarSesionServidor() {
  var userProps = PropertiesService.getUserProperties();
  userProps.deleteAllProperties();
  return true;
}

function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}
