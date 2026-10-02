/**
 * Controlador de Pedidos (y sus líneas Pedido_Items)
 * Archivo: 20_Ctrl_Pedidos.gs
 */
class Ctrl_Pedidos extends Base_Controller {

  index() {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA, CONFIG.ROLES.COCINA])) {
      return this._denyAccess();
    }

    return this.view('Dashboard_Pedidos', Object.assign({
      title: "Gestión de Pedidos",
      activeMenu: "pedidos",
      pedidos: Pedido_Model.getAllWithItems(),
      estados: CONFIG.ESTADOS_PEDIDO
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  /**
   * Obtiene un pedido con sus items (para el modal de detalle)
   */
  getById(data) {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA, CONFIG.ROLES.COCINA])) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.pedido_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var pedido = Pedido_Model.getWithItems(data.pedido_id);
    if (!pedido) {
      return JSON.stringify({ success: false, message: 'Pedido no encontrado' });
    }

    return JSON.stringify({ success: true, pedido: pedido });
  }

  /**
   * Cambia el estado de un pedido (PENDIENTE -> EN_PREPARACION -> LISTO -> ENTREGADO, o CANCELADO)
   */
  updateEstado(data) {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA, CONFIG.ROLES.COCINA])) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.pedido_id || !data.estado) {
      return JSON.stringify({ success: false, message: 'Datos incompletos' });
    }

    var result = Pedido_Model.setEstado(data.pedido_id, data.estado);
    return JSON.stringify(result);
  }

  /**
   * Crea un pedido manualmente desde el dashboard (Caja/Admin)
   */
  create(data) {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA])) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var user = this._getSessionUser();
    data.creado_por_user_id = user ? user.user_id : '';

    var result = Pedido_Model.create(data);
    return JSON.stringify(result);
  }

  /**
   * Cancela (elimina lógicamente) un pedido completo, sus items incluidos.
   */
  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.pedido_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var pedido = Base_Model.all(CONFIG.DB.PEDIDOS).find(function(p) {
      return String(p.pedido_id).trim() === String(data.pedido_id).trim();
    });

    if (!pedido) {
      return JSON.stringify({ success: false, message: 'Pedido no encontrado' });
    }

    var items = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS).filter(function(it) {
      return String(it.pedido_id).trim() === String(data.pedido_id).trim();
    });

    for (var i = 0; i < items.length; i++) {
      Base_Model.delete(CONFIG.DB.PEDIDO_ITEMS, items[i].item_id);
    }

    Base_Model.delete(CONFIG.DB.PEDIDOS, data.pedido_id);

    return JSON.stringify({ success: true, message: '¡Pedido eliminado junto con sus productos!' });
  }

  /**
   * Ticket de cocina de un pedido ya confirmado (página standalone,
   * pensada para abrirse en una pestaña propia e imprimirse).
   * No expone precios: la cocina solo necesita saber qué preparar.
   * Solo puede verlo el staff (Admin/Caja/Cocina) o el usuario dueño del pedido.
   */
  ticket(data) {
    var sessionUser = this._getSessionUser();
    if (!sessionUser) {
      return this.redirect('login');
    }

    if (!data || !data.pedido_id) {
      return HtmlService.createHtmlOutput('<h1>Ticket no encontrado</h1>');
    }

    var pedido = Pedido_Model.getWithItems(data.pedido_id);
    if (!pedido) {
      return HtmlService.createHtmlOutput('<h1>Pedido no encontrado</h1>');
    }

    var esStaff = [CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA, CONFIG.ROLES.COCINA]
      .indexOf(parseInt(sessionUser.rol_id)) !== -1;
    var esDueño = pedido.user_id &&
      String(pedido.user_id).trim() === String(sessionUser.user_id).trim();

    if (!esStaff && !esDueño) {
      return this._denyAccess();
    }

    return this.viewStandalone('Ticket_Cocina', {
      title: 'Ticket cocina #' + pedido.numero_pedido,
      pedido: pedido
    });
  }

  // ==========================================
  // GESTIÓN DE LÍNEAS (PEDIDO_ITEMS) DE UN PEDIDO EXISTENTE
  // ==========================================

  /**
   * Agrega una línea a un pedido ya creado (mientras no esté cerrado) y
   * recalcula el total del pedido.
   */
  addItem(data) {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA])) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.pedido_id || !data.product_id) {
      return JSON.stringify({ success: false, message: 'Datos incompletos' });
    }

    var pedido = Base_Model.all(CONFIG.DB.PEDIDOS).find(function(p) {
      return String(p.pedido_id).trim() === String(data.pedido_id).trim();
    });

    if (!pedido) {
      return JSON.stringify({ success: false, message: 'Pedido no encontrado' });
    }

    if (['ENTREGADO', 'CANCELADO'].indexOf(pedido.estado) !== -1) {
      return JSON.stringify({ success: false, message: 'El pedido ya está cerrado.' });
    }

    var producto = Base_Model.all(CONFIG.DB.PRODUCTOS).find(function(p) {
      return String(p.product_id).trim() === String(data.product_id).trim();
    });

    if (!producto) {
      return JSON.stringify({ success: false, message: 'Producto no encontrado' });
    }

    var cantidad = parseInt(data.cantidad) || 1;
    var precioUnitario = parseFloat(producto.precio) || 0;
    var lineaSubtotal = Math.round(precioUnitario * cantidad * 100) / 100;

    var itemId = Base_Model.getNextId(CONFIG.DB.PEDIDO_ITEMS);
    Base_Model.create(CONFIG.DB.PEDIDO_ITEMS, {
      item_id: itemId,
      pedido_id: pedido.pedido_id,
      product_id: producto.product_id,
      nombre_producto: producto.nombre,
      cantidad: cantidad,
      precio_unitario: precioUnitario,
      subtotal: lineaSubtotal,
      notas: data.notas || ''
    });

    this._recalcularTotal(pedido.pedido_id);

    return JSON.stringify({ success: true, message: 'Producto agregado al pedido' });
  }

  /**
   * Elimina una línea de un pedido y recalcula el total.
   */
  removeItem(data) {
    if (!this._checkRolePermission([CONFIG.ROLES.ADMIN, CONFIG.ROLES.CAJA])) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.item_id) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var item = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS).find(function(it) {
      return String(it.item_id).trim() === String(data.item_id).trim();
    });

    if (!item) {
      return JSON.stringify({ success: false, message: 'Línea no encontrada' });
    }

    Base_Model.delete(CONFIG.DB.PEDIDO_ITEMS, data.item_id);
    this._recalcularTotal(item.pedido_id);

    return JSON.stringify({ success: true, message: 'Producto eliminado del pedido' });
  }

  /**
   * Recalcula el subtotal y actualiza el total guardado en PEDIDOS.
   * Sin impuesto: el total es igual al subtotal de las líneas.
   */
  _recalcularTotal(pedidoId) {
    var items = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS).filter(function(it) {
      return String(it.pedido_id).trim() === String(pedidoId).trim();
    });

    var subtotal = items.reduce(function(acc, it) {
      return acc + (parseFloat(it.subtotal) || 0);
    }, 0);

    var total = Math.round(subtotal * 100) / 100;

    Base_Model.update(CONFIG.DB.PEDIDOS, pedidoId, { total: total });
    return total;
  }
}

globalThis.Ctrl_Pedidos = Ctrl_Pedidos;

// Funciones puente para google.script.run
function getPedidoById(data) {
  var controller = new Ctrl_Pedidos();
  return controller.getById(data);
}

function updatePedidoEstado(data) {
  var controller = new Ctrl_Pedidos();
  return controller.updateEstado(data);
}

function createPedidoDashboard(data) {
  var controller = new Ctrl_Pedidos();
  return controller.create(data);
}

function deletePedido(data) {
  var controller = new Ctrl_Pedidos();
  return controller.delete(data);
}

function addPedidoItem(data) {
  var controller = new Ctrl_Pedidos();
  return controller.addItem(data);
}

function removePedidoItem(data) {
  var controller = new Ctrl_Pedidos();
  return controller.removeItem(data);
}



