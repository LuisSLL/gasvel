/**
 * Controlador de Roles
 * Archivo: 17_Ctrl_Roles.gs
 *
 * Los roles usan rol_id como STRING (slug del nombre).
 * Cada rol tiene una columna PERMISOS con las vistas que puede ver.
 */

class Ctrl_Roles extends Base_Controller {

  index() {
    if (!this._hasPermission('roles')) {
      return this._denyAccess();
    }

    var users = Base_Model.all(CONFIG.DB.USERS);

    var roles = Base_Model.all(CONFIG.DB.ROLES).map(function(r) {
      r.total_usuarios = users.filter(function(u) {
        return String(u.rol_id).trim().toLowerCase() === String(r.rol_id).trim().toLowerCase();
      }).length;
      return r;
    });

    return this.view('Dashboard_Roles', Object.assign({
      title: "Gestión de Roles",
      activeMenu: "roles",
      roles: roles
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  update(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.rol_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var rol = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return String(r.rol_id).trim().toLowerCase() === String(data.rol_id).trim().toLowerCase();
    });

    if (!rol) {
      return JSON.stringify({ success: false, message: 'Rol no encontrado' });
    }

    var updated = {
      rol_id: rol.rol_id,
      nombre: data.nombre ? data.nombre.toString().trim().toUpperCase() : rol.nombre,
      descripcion: data.descripcion !== undefined ? data.descripcion : rol.descripcion,
      permisos: data.permisos !== undefined ? data.permisos : (rol.permisos || '')
    };

    Base_Model.update(CONFIG.DB.ROLES, rol.rol_id, updated);
    return JSON.stringify({ success: true, message: '¡Rol actualizado!' });
  }

  /**
   * ✅ Actualiza SOLO los permisos del rol.
   */
  updatePermisos(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.rol_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var rol = Base_Model.all(CONFIG.DB.ROLES).find(function(r) {
      return String(r.rol_id).trim().toLowerCase() === String(data.rol_id).trim().toLowerCase();
    });

    if (!rol) {
      return JSON.stringify({ success: false, message: 'Rol no encontrado' });
    }

    // El admin NUNCA puede perder permisos (evita que se bloquee a sí mismo)
    if (rol.rol_id === 'admin') {
      return JSON.stringify({ success: false, message: 'El rol Admin no puede perder permisos.' });
    }

    var permisos = (data.permisos || '').toString().trim();

    Base_Model.update(CONFIG.DB.ROLES, rol.rol_id, {
      permisos: permisos
    });

    Logger.log('✅ Permisos actualizados para ' + rol.rol_id + ': ' + permisos);
    return JSON.stringify({ success: true, message: 'Permisos actualizados.' });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.rol_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var rolesBase = ['admin', 'mozo', 'cocina', 'cliente', 'totem'];
    var rolIdStr = String(data.rol_id).trim().toLowerCase();

    if (rolesBase.indexOf(rolIdStr) !== -1) {
      return JSON.stringify({ success: false, message: 'No se pueden eliminar los roles base del sistema.' });
    }

    var enUso = Base_Model.all(CONFIG.DB.USERS).some(function(u) {
      return String(u.rol_id).trim().toLowerCase() === rolIdStr;
    });

    if (enUso) {
      return JSON.stringify({ success: false, message: 'No se puede eliminar: hay usuarios con este rol asignado.' });
    }

    Base_Model.delete(CONFIG.DB.ROLES, data.rol_id);
    return JSON.stringify({ success: true, message: '¡Rol eliminado!' });
  }

  // 👈 _slugify_ ELIMINADO (solo lo usaba create)
}

globalThis.Ctrl_Roles = Ctrl_Roles;

// ==========================================
// FUNCIONES PUENTE
// ==========================================

// 👈 createRol ELIMINADO

function updateRol(data) {
  var controller = new Ctrl_Roles();
  return controller.update(data);
}

function updatePermisosRol(data) {
  var controller = new Ctrl_Roles();
  return controller.updatePermisos(data);
}

function deleteRol(data) {
  var controller = new Ctrl_Roles();
  return controller.delete(data);
}

Logger.log('✅ Ctrl_Roles registrado');
