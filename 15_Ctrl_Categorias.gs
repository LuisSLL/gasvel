/**
 * Controlador de Categorías
 * Archivo: 15_Ctrl_Categorias.gs
 *
 * Ver categorías: cualquiera con permiso 'categorias'.
 * Crear/Editar/Eliminar: admin.
 */

class Ctrl_Categorias extends Base_Controller {

  index() {
    if (!this._hasPermission('categorias')) {
      return this._denyAccess();
    }

    return this.view('Dashboard_Categorias', Object.assign({
      title: "Gestión de Categorías",
      activeMenu: "categorias",
      categorias: Base_Model.all(CONFIG.DB.CATEGORIAS)
    }, this._getDashboardUserData()), 'Layout_Dashboard');
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

    // 👇 Devolver la categoría creada para que el front la pinte en vivo
    return JSON.stringify({
      success: true,
      message: '¡Categoría creada!',
      categoria: nueva
    });
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

    // 👇 Devolver la categoría actualizada
    return JSON.stringify({
      success: true,
      message: '¡Categoría actualizada!',
      categoria: updated
    });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.cat_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var enUso = Base_Model.all(CONFIG.DB.PRODUCTOS).some(function(p) {
      return String(p.cat_id).trim() === String(data.cat_id).trim();
    });

    if (enUso) {
      return JSON.stringify({ success: false, message: 'No se puede eliminar: hay productos asociados a esta categoría.' });
    }

    Base_Model.delete(CONFIG.DB.CATEGORIAS, data.cat_id);

    // 👇 Devolver el cat_id eliminado para que el front sepa qué fila borrar
    return JSON.stringify({
      success: true,
      message: '¡Categoría eliminada!',
      cat_id: data.cat_id
    });
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
