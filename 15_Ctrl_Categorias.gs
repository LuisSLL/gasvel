/**
 * Controlador de Categorías
 * Archivo: 15_Ctrl_Categorias.gs
 */
class Ctrl_Categorias extends Base_Controller {

  _checkAdminPermission() {
    var userProps = PropertiesService.getUserProperties();
    var sessionEmail = userProps.getProperty('userEmail');
    if (!sessionEmail) return false;
    
    var user = Base_Model.all(CONFIG.DB.USERS).find(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === sessionEmail.toLowerCase();
    });
    
    return user && parseInt(user.rol_id) === 1;
  }

  index() {
    if (!this._checkAdminPermission()) {
      return this.redirect('login');
    }
    
    return this.view('Dashboard_Categorias', {
      title: "Gestión de Categorías",
      userName: "Admin",
      userInitial: "A",
      userRole: "Admin",
      categorias: Base_Model.all(CONFIG.DB.CATEGORIAS)
    }, 'Layout_Dashboard');
  }

  create(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.nombre) {
      return JSON.stringify({ success: false, message: 'Nombre es obligatorio' });
    }

    var existing = Base_Model.all(CONFIG.DB.CATEGORIAS).find(function(c) {
      return c.nombre && c.nombre.toString().trim().toLowerCase() === data.nombre.toString().trim().toLowerCase();
    });

    if (existing) {
      return JSON.stringify({ success: false, message: 'Categoría ya existe' });
    }

    var nextId = Base_Model.getNextId(CONFIG.DB.CATEGORIAS);
    var nueva = {
      cat_id: nextId,
      nombre: data.nombre.toString().trim(),
      descripcion: data.descripcion || '',
      activo: true
    };

    Base_Model.create(CONFIG.DB.CATEGORIAS, nueva);
    return JSON.stringify({ success: true, message: '¡Categoría creada!' });
  }

  update(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.cat_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var cat = Base_Model.all(CONFIG.DB.CATEGORIAS).find(function(c) {
      return String(c.cat_id).trim() === String(data.cat_id).trim();
    });

    if (!cat) {
      return JSON.stringify({ success: false, message: 'Categoría no encontrada' });
    }

    var updated = {
      cat_id: cat.cat_id,
      nombre: data.nombre || cat.nombre,
      descripcion: data.descripcion || cat.descripcion,
      activo: cat.activo
    };

    Base_Model.update(CONFIG.DB.CATEGORIAS, cat.cat_id, updated);
    return JSON.stringify({ success: true, message: '¡Categoría actualizada!' });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.cat_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    Base_Model.delete(CONFIG.DB.CATEGORIAS, data.cat_id);
    return JSON.stringify({ success: true, message: '¡Categoría eliminada!' });
  }
}

globalThis.Ctrl_Categorias = Ctrl_Categorias;

// Funciones puente
function createCategoria(data) {
  var controller = new Ctrl_Categorias();
  return controller.create(data);
}

function updateCategoria(data) {
  var controller = new Ctrl_Categorias();
  return controller.update(data);
}

function deleteCategoria(data) {
  var controller = new Ctrl_Categorias();
  return controller.delete(data);
}
