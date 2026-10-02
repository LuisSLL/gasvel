/**
 * Controlador de Productos
 * Archivo: 16_Ctrl_Productos.gs
 */
class Ctrl_Productos extends Base_Controller {

  index() {
    if (!this._checkAdminPermission()) {
      return this._denyAccess();
    }

    var categorias = Base_Model.all(CONFIG.DB.CATEGORIAS);
    var catMap = {};
    categorias.forEach(function(c) { catMap[c.cat_id] = c.nombre; });

    var productos = Base_Model.all(CONFIG.DB.PRODUCTOS).map(function(p) {
      p.cat_nombre = catMap[p.cat_id] || 'Sin categoría';
      return p;
    });

    return this.view('Dashboard_Productos', Object.assign({
      title: "Gestión de Productos",
      activeMenu: "productos",
      productos: productos,
      categorias: categorias
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  create(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.nombre || !data.precio || !data.cat_id) {
      return JSON.stringify({ success: false, message: 'Nombre, precio y categoría son obligatorios' });
    }

    var precio = parseFloat(data.precio);
    if (isNaN(precio) || precio < 0) {
      return JSON.stringify({ success: false, message: 'El precio debe ser un número válido' });
    }

    var catExiste = Base_Model.all(CONFIG.DB.CATEGORIAS).some(function(c) {
      return String(c.cat_id).trim() === String(data.cat_id).trim();
    });
    if (!catExiste) {
      return JSON.stringify({ success: false, message: 'La categoría seleccionada no existe' });
    }

    var nextId = Base_Model.getNextId(CONFIG.DB.PRODUCTOS);
    var nuevo = {
      product_id: nextId,
      nombre: data.nombre.toString().trim(),
      descripcion: data.descripcion || '',
      precio: precio,
      cat_id: parseInt(data.cat_id),
      imagen_url: data.imagen_url || '',
      activo: true,
      tiempo_preparacion: data.tiempo_preparacion ? parseInt(data.tiempo_preparacion) : 0,
      stock_control: data.stock_control === true || data.stock_control === 'true',
      stock_actual: data.stock_actual ? parseInt(data.stock_actual) : 0
    };

    Base_Model.create(CONFIG.DB.PRODUCTOS, nuevo);
    return JSON.stringify({ success: true, message: '¡Producto creado!' });
  }

  update(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.product_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var prod = Base_Model.all(CONFIG.DB.PRODUCTOS).find(function(p) {
      return String(p.product_id).trim() === String(data.product_id).trim();
    });

    if (!prod) {
      return JSON.stringify({ success: false, message: 'Producto no encontrado' });
    }

    var precio = data.precio !== undefined && data.precio !== '' ? parseFloat(data.precio) : parseFloat(prod.precio);
    if (isNaN(precio) || precio < 0) {
      return JSON.stringify({ success: false, message: 'El precio debe ser un número válido' });
    }

    var updated = {
      product_id: prod.product_id,
      nombre: data.nombre || prod.nombre,
      descripcion: data.descripcion !== undefined ? data.descripcion : prod.descripcion,
      precio: precio,
      cat_id: data.cat_id ? parseInt(data.cat_id) : prod.cat_id,
      imagen_url: data.imagen_url !== undefined ? data.imagen_url : prod.imagen_url,
      activo: data.activo !== undefined ? (data.activo === true || data.activo === 'true') : prod.activo,
      tiempo_preparacion: data.tiempo_preparacion !== undefined ? parseInt(data.tiempo_preparacion) : prod.tiempo_preparacion,
      stock_control: data.stock_control !== undefined ? (data.stock_control === true || data.stock_control === 'true') : prod.stock_control,
      stock_actual: data.stock_actual !== undefined ? parseInt(data.stock_actual) : prod.stock_actual
    };

    Base_Model.update(CONFIG.DB.PRODUCTOS, prod.product_id, updated);
    return JSON.stringify({ success: true, message: '¡Producto actualizado!' });
  }

  toggleActivo(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.product_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var prod = Base_Model.all(CONFIG.DB.PRODUCTOS).find(function(p) {
      return String(p.product_id).trim() === String(data.product_id).trim();
    });

    if (!prod) {
      return JSON.stringify({ success: false, message: 'Producto no encontrado' });
    }

    var nuevoEstado = !(prod.activo === true || prod.activo.toString().toUpperCase() === 'TRUE');
    Base_Model.update(CONFIG.DB.PRODUCTOS, prod.product_id, { activo: nuevoEstado });

    return JSON.stringify({ success: true, message: nuevoEstado ? 'Producto activado' : 'Producto desactivado' });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.product_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var enUso = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS).some(function(it) {
      return String(it.product_id).trim() === String(data.product_id).trim();
    });

    if (enUso) {
      return JSON.stringify({ success: false, message: 'No se puede eliminar: el producto tiene pedidos asociados. Desactívalo en su lugar.' });
    }

    Base_Model.delete(CONFIG.DB.PRODUCTOS, data.product_id);
    return JSON.stringify({ success: true, message: '¡Producto eliminado!' });
  }
}

globalThis.Ctrl_Productos = Ctrl_Productos;

// Funciones puente
function createProducto(data) {
  var controller = new Ctrl_Productos();
  return controller.create(data);
}

function updateProducto(data) {
  var controller = new Ctrl_Productos();
  return controller.update(data);
}

function toggleProductoActivo(data) {
  var controller = new Ctrl_Productos();
  return controller.toggleActivo(data);
}

function deleteProducto(data) {
  var controller = new Ctrl_Productos();
  return controller.delete(data);
}


