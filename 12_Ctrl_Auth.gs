/**
 * Controlador de Autenticación y Dashboard
 * Archivo: 12_Ctrl_Auth.gs
 * Extiende Base_Controller
 */

class Ctrl_Auth extends Base_Controller {

  // ==========================================
  // 1. VISTAS PÚBLICAS (LOGIN Y REGISTRO)
  // ==========================================

  /**
   * Renderiza la vista de inicio de sesión
   */
  showLogin() {
    Logger.log('==> [Ctrl_Auth.showLogin] Renderizando vista Login...');
    var result = this.view('Login', {
      title: "Iniciar Sesión"
    }, 'Layout_Login');
    Logger.log('<== [Ctrl_Auth.showLogin] Vista Login lista.');
    return result;
  }

  /**
   * Procesa el Login (invocado vía AJAX/google.script.run)
   * @param {Object} data - Objeto con email y password
   */
  login(data) {
    Logger.log('==> [Ctrl_Auth.login] Petición recibida con payload: ' + JSON.stringify(data ? { email: data.email, passLength: data.password ? data.password.length : 0 } : null));

    if (!data || !data.email || !data.password) {
      Logger.log('⚠️ [Ctrl_Auth.login] Validación fallida: Credenciales incompletas.');
      return {
        success: false,
        message: 'Por favor, ingresa tu correo y contraseña.'
      };
    }

    var email = data.email.toString().trim().toLowerCase();
    var pass = data.password.toString();
    
    Logger.log('==> [Ctrl_Auth.login] Buscando usuario con correo: ' + email);

    // Búsqueda en la tabla USERS usando Base_Model
    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === email;
    });
    
    Logger.log('==> [Ctrl_Auth.login] Estado de búsqueda: ' + (user ? 'Encontrado (ID: ' + user.user_id + ', Activo: ' + user.activo + ')' : 'No encontrado'));

    // Validar existencia y estado activo
    if (user && (user.activo === true || user.activo.toString().toUpperCase() === 'TRUE')) {
      var hashedInput = User_Model.hashPassword(pass);
      Logger.log('==> [Ctrl_Auth.login] Verificando hash de contraseña...');

      if (user.pass_hash === hashedInput) {
        Logger.log('✅ [Ctrl_Auth.login] Contraseña válida. Guardando PropertiesService...');

        // ✅ GUARDAR SESIÓN INDIVIDUAL EN USER PROPERTIES
        var userProps = PropertiesService.getUserProperties();
        userProps.setProperty('userEmail', email);
        userProps.setProperty('userId', user.user_id.toString());
        userProps.setProperty('userRole', user.rol_id.toString());

        // Datos limpios del usuario para la sesión del cliente
        var userData = {
          id: user.user_id,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          rol_id: user.rol_id
        };
        
        // REDIRECCIÓN SEGÚN ROL USANDO LA URL OFICIAL DE LA WEB APP
        var baseUrl = getWebAppUrl();
        var redirectUrl = baseUrl + '?p=home';
        
        if (parseInt(user.rol_id) === 1 || parseInt(user.rol_id) === 2) {
          redirectUrl = baseUrl + '?p=dashboard';
        }
        
        Logger.log('<== [Ctrl_Auth.login] Autenticado con éxito. Redireccionando a: ' + redirectUrl);
        return {
          success: true,
          message: '¡Login exitoso!',
          user: userData,
          url: redirectUrl
        };
      } else {
        Logger.log('❌ [Ctrl_Auth.login] Hash mismatched. Contraseña incorrecta.');
        return {
          success: false,
          message: 'La contraseña es incorrecta.'
        };
      }
    } else {
      Logger.log('⚠️ [Ctrl_Auth.login] Usuario no hallado o en estado inactivo.');
      return {
        success: false,
        message: 'Usuario no encontrado o inactivo.'
      };
    }
  }

  /**
   * Renderiza la vista de registro público
   */
  showRegister() {
    Logger.log('==> [Ctrl_Auth.showRegister] Renderizando registro público...');
    return this.view('Register', {
      title: "Registro de Usuario"
    }, 'Layout_Login');
  }

  /**
   * Procesa el Registro (Rol 4: CLIENTE por defecto)
   * @param {Object} data - Datos del nuevo usuario
   */
  register(data) {
    Logger.log('==> [Ctrl_Auth.register] Registrando nuevo usuario. Payload: ' + JSON.stringify(data));

    if (!data || !data.email || !data.password || !data.name) {
      Logger.log('⚠️ [Ctrl_Auth.register] Campos obligatorios incompletos.');
      return {
        success: false,
        message: 'Nombre, correo y contraseña son obligatorios.'
      };
    }

    var cleanEmail = data.email.toString().trim().toLowerCase();
    
    // Verificar si el correo ya está registrado
    var existingUser = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === cleanEmail;
    });
    
    if (existingUser) {
      Logger.log('⚠️ [Ctrl_Auth.register] El email ya existe: ' + cleanEmail);
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
      rol_id: 4,
      pass_hash: User_Model.hashPassword(data.password),
      activo: true,
      fecha_registro: new Date()
    };

    Logger.log('==> [Ctrl_Auth.register] Creando registro ID: ' + nextId);
    Base_Model.create(CONFIG.DB.USERS, newUser);
    Logger.log('✅ [Ctrl_Auth.register] Usuario registrado correctamente.');
    
    var baseUrl = getWebAppUrl();
    return {
      success: true,
      message: '¡Registro exitoso! Ya puedes iniciar sesión.',
      url: baseUrl + '?p=login'
    };
  }

  // ==========================================
  // 2. DASHBOARD (ADMINISTRACIÓN)
  // ==========================================

  /**
   * Muestra el Dashboard administrativo
   */
  showDashboard() {
    Logger.log('==> [Ctrl_Auth.showDashboard] Comprobando sesión activa...');
    var userProps = PropertiesService.getUserProperties();
    var sessionEmail = userProps.getProperty('userEmail');
    
    Logger.log('==> [Ctrl_Auth.showDashboard] Email de sesión obtenido: ' + sessionEmail);

    if (!sessionEmail) {
      Logger.log('⚠️ [Ctrl_Auth.showDashboard] Sesión inexistente. Redirigiendo a login...');
      return this.redirect('login');
    }

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === sessionEmail.toLowerCase();
    });

    if (!user || (parseInt(user.rol_id) !== 1 && parseInt(user.rol_id) !== 2)) {
      Logger.log('⚠️ [Ctrl_Auth.showDashboard] Acceso denegado. Rol o usuario inválido.');
      return this.redirect('home');
    }

    Logger.log('✅ [Ctrl_Auth.showDashboard] Usuario autorizado. Generando vista...');
    return this.view('Dashboard', {
      title: "Gestión del Sistema",
      userName: user.nombre,
      userInitial: user.nombre.charAt(0).toUpperCase(),
      userRole: parseInt(user.rol_id) === 1 ? 'Admin' : 'Cajero',
      users: Base_Model.all(CONFIG.DB.USERS)
    }, 'Layout_Dashboard'); 
  }

  /**
   * Crea un usuario administrativamente desde el Dashboard
   */
  createUser(data) {
    Logger.log('==> [Ctrl_Auth.createUser] Petición de creación: ' + JSON.stringify(data));

    if (!data || !data.email || (!data.name && !data.nombre)) {
      Logger.log('⚠️ [Ctrl_Auth.createUser] Datos incompletos.');
      return { success: false, message: 'Nombre y correo electrónico son obligatorios.' };
    }

    var cleanEmail = data.email.toString().trim().toLowerCase();
    var existing = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === cleanEmail;
    });
    
    if (existing) {
      Logger.log('⚠️ [Ctrl_Auth.createUser] Conflicto: El correo ya existe (' + cleanEmail + ')');
      return {
        success: false,
        message: 'El correo especificado ya pertenece a un usuario registrado.'
      };
    }

    var nextId = Base_Model.getNextId(CONFIG.DB.USERS);
    var newUser = {
      user_id: nextId,
      nombre: (data.name || data.nombre).toString().trim(),
      apellido: (data.lastName || data.apellido || '').toString().trim(),
      email: cleanEmail,
      telefono: (data.phone || data.telefono || '').toString().trim(),
      wpp: (data.whatsapp || data.wpp || '').toString().trim(),
      rol_id: Number(data.roleId),
      pass_hash: User_Model.hashPassword(data.password || '123456'),
      activo: true,
      fecha_registro: new Date()
    };

    Logger.log('==> [Ctrl_Auth.createUser] Guardando nuevo registro con ID: ' + nextId);
    Base_Model.create(CONFIG.DB.USERS, newUser);
    Logger.log('✅ [Ctrl_Auth.createUser] Usuario creado con éxito.');

    return {
      success: true,
      message: 'Usuario creado exitosamente.'
    };
  }

  /**
   * Cierra la sesión borrando propiedades del usuario
   */
  logout() {
    Logger.log('==> [Ctrl_Auth.logout] Limpiando PropertiesService...');
    var userProps = PropertiesService.getUserProperties();
    userProps.deleteAllProperties();
    Logger.log('✅ [Ctrl_Auth.logout] Sesión destruida.');
    return this.redirect('login');
  }

  // ==========================================
  // 3. CRUD DE USUARIOS (Para el Dashboard)
  // ==========================================

  /**
   * Obtener un usuario por ID (para edición o consulta)
   */
  getUserById(data) {
    Logger.log('==> [Ctrl_Auth.getUserById] Entrada recibida: ' + JSON.stringify(data));

    var targetId = null;
    if (typeof data === 'object' && data !== null) {
      targetId = data.user_id || data.id;
    } else {
      targetId = data;
    }

    if (targetId === null || targetId === undefined || String(targetId).trim() === '') {
      Logger.log('⚠️ [Ctrl_Auth.getUserById] ID no especificado o nulo.');
      return { success: false, message: 'ID de usuario no especificado.' };
    }

    var searchIdStr = String(targetId).trim();
    Logger.log('==> [Ctrl_Auth.getUserById] Buscando usuario con ID: ' + searchIdStr);

    var allUsers = Base_Model.all(CONFIG.DB.USERS);
    Logger.log('==> [Ctrl_Auth.getUserById] Total usuarios recuperados de DB: ' + (allUsers ? allUsers.length : 0));

    var user = allUsers.find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === searchIdStr;
    });

    if (!user) {
      Logger.log('⚠️ [Ctrl_Auth.getUserById] Usuario con ID (' + searchIdStr + ') no fue encontrado.');
      return { success: false, message: 'Usuario no encontrado.' };
    }

    Logger.log('✅ [Ctrl_Auth.getUserById] Usuario localizado: ' + user.nombre + ' (' + user.email + ')');
    return { success: true, user: user };
  }

  /**
   * Actualizar un usuario existente
   */
  updateUser(data) {
    Logger.log('==> [Ctrl_Auth.updateUser] Petición con datos: ' + JSON.stringify(data));

    if (!data || (!data.user_id && !data.id)) {
      Logger.log('⚠️ [Ctrl_Auth.updateUser] ID no válido.');
      return { success: false, message: 'ID de usuario inválido.' };
    }

    var targetId = String(data.user_id || data.id).trim();

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === targetId;
    });

    if (!user) {
      Logger.log('⚠️ [Ctrl_Auth.updateUser] No se encontró el registro para el ID: ' + targetId);
      return { success: false, message: 'Usuario no encontrado para actualizar.' };
    }

    var updatedUser = {
      user_id: user.user_id,
      nombre: data.nombre !== undefined ? data.nombre : user.nombre,
      apellido: data.apellido !== undefined ? data.apellido : user.apellido,
      email: data.email !== undefined ? data.email : user.email,
      telefono: data.telefono !== undefined ? data.telefono : user.telefono,
      wpp: data.wpp !== undefined ? data.wpp : user.wpp,
      rol_id: data.roleId ? parseInt(data.roleId) : user.rol_id,
      pass_hash: (data.password && data.password.toString().trim() !== '') ? User_Model.hashPassword(data.password) : user.pass_hash,
      activo: user.activo,
      fecha_registro: user.fecha_registro
    };

    Logger.log('==> [Ctrl_Auth.updateUser] Actualizando en base de datos...');
    Base_Model.update(CONFIG.DB.USERS, user.user_id, updatedUser);
    Logger.log('✅ [Ctrl_Auth.updateUser] Usuario actualizado exitosamente.');

    return { success: true, message: '¡Usuario actualizado exitosamente!' };
  }

  /**
   * Eliminar un usuario por ID
   */
  deleteUser(data) {
    Logger.log('==> [Ctrl_Auth.deleteUser] Petición de eliminación: ' + JSON.stringify(data));

    var targetId = null;
    if (typeof data === 'object' && data !== null) {
      targetId = data.user_id || data.id;
    } else {
      targetId = data;
    }

    if (!targetId) {
      Logger.log('⚠️ [Ctrl_Auth.deleteUser] ID no provisto.');
      return { success: false, message: 'ID de usuario no especificado.' };
    }

    var searchIdStr = String(targetId).trim();

    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u && u.user_id !== undefined && String(u.user_id).trim() === searchIdStr;
    });

    if (!user) {
      Logger.log('⚠️ [Ctrl_Auth.deleteUser] Usuario no hallado en la DB.');
      return { success: false, message: 'Usuario no encontrado.' };
    }

    Logger.log('==> [Ctrl_Auth.deleteUser] Eliminando registro ID: ' + user.user_id);
    Base_Model.delete(CONFIG.DB.USERS, user.user_id);
    Logger.log('✅ [Ctrl_Auth.deleteUser] Usuario eliminado con éxito.');

    return { success: true, message: '¡Usuario eliminado exitosamente!' };
  }
}

// Registro global del controlador
globalThis.Ctrl_Auth = Ctrl_Auth;

// ==========================================
// FUNCIONES PUENTE PARA google.script.run
// ==========================================

function login(data) {
  if (!data) data = {};
  var controller = new Ctrl_Auth();
  return JSON.stringify(controller.login(data));
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

function obtenerUsuarioHtml(userId) {
  var controller = new Ctrl_Auth();
  var result = controller.getUserById({ user_id: userId });
  return HtmlService.createHtmlOutput(JSON.stringify(result));
}

// 🚨 SOLUCIÓN PARA REDIRECCIONES CORRECTAS (Evita iframe de googleusercontent)
function getWebAppUrl() {
  return ScriptApp.getService().getUrl();
}
