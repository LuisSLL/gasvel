/**
 * Controlador de Roles
 * Archivo: 17_Ctrl_Roles.gs
 */
class Ctrl_Roles extends Base_Controller {

  index() {
    if (!this._checkAdminPermission()) {
      return this._denyAccess();
    }

    var users = Base_Model.all(CONFIG.DB.USERS);

    var roles = Base_Model.all(CONFIG.DB.ROLES).map(function(r) {
      r.total_usuarios = users.filter(function(u) {
        return String(u.rol_id).trim() === String(r.rol_id).trim();
      }).length;
      return r;
    });

    return this.view('Dashboard_Roles', Object.assign({
      title: "Gestión de Roles",
      activeMenu: "roles",
      roles: roles
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  create(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.nombre) {
      return JSON.stringify({ success: false, message: 'Nombre es obligatorio' });
    }

    var nombreLimpio = data.nombre.toString().trim().toUpperCase();

    var existing = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return r.nombre && r.nombre.toString().trim().toUpperCase() === nombreLimpio;
    });

    if (existing) {
      return JSON.stringify({ success: false, message: 'Ese rol ya existe' });
    }

    var nextId = Base_Model.getNextId(CONFIG.DB.ROLES);
    var nuevo = {
      rol_id: nextId,
      nombre: nombreLimpio,
      descripcion: data.descripcion || ''
    };

    Base_Model.create(CONFIG.DB.ROLES, nuevo);
    return JSON.stringify({ success: true, message: '¡Rol creado!' });
  }

  update(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.rol_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var rol = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return String(r.rol_id).trim() === String(data.rol_id).trim();
    });

    if (!rol) {
      return JSON.stringify({ success: false, message: 'Rol no encontrado' });
    }

    var updated = {
      rol_id: rol.rol_id,
      nombre: data.nombre ? data.nombre.toString().trim().toUpperCase() : rol.nombre,
      descripcion: data.descripcion !== undefined ? data.descripcion : rol.descripcion
    };

    Base_Model.update(CONFIG.DB.ROLES, rol.rol_id, updated);
    return JSON.stringify({ success: true, message: '¡Rol actualizado!' });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.rol_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    // Roles base del sistema (1-4) no se pueden eliminar
    if ([1, 2, 3, 4].indexOf(parseInt(data.rol_id)) !== -1) {
      return JSON.stringify({ success: false, message: 'No se pueden eliminar los roles base del sistema.' });
    }

    var enUso = Base_Model.all(CONFIG.DB.USERS).some(function(u) {
      return String(u.rol_id).trim() === String(data.rol_id).trim();
    });

    if (enUso) {
      return JSON.stringify({ success: false, message: 'No se puede eliminar: hay usuarios con este rol asignado.' });
    }

    Base_Model.delete(CONFIG.DB.ROLES, data.rol_id);
    return JSON.stringify({ success: true, message: '¡Rol eliminado!' });
  }
}

globalThis.Ctrl_Roles = Ctrl_Roles;

// Funciones puente
function createRol(data) {
  var controller = new Ctrl_Roles();
  return controller.create(data);
}

function updateRol(data) {
  var controller = new Ctrl_Roles();
  return controller.update(data);
}

function deleteRol(data) {
  var controller = new Ctrl_Roles();
  return controller.delete(data);
}


