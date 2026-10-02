/**
 * Modelo de dominio para Pedidos + Pedido_Items
 * Archivo: 19_Model_Pedidos.gs
 *
 * Centraliza la lógica de creación/actualización de pedidos para que tanto
 * el POS público (Ctrl_Home) como el panel administrativo (Ctrl_Pedidos)
 * compartan las mismas reglas de negocio.
 */
var Pedido_Model = {

  /**
   * Crea un pedido junto con sus líneas (PEDIDO_ITEMS).
   * El precio de cada línea SIEMPRE se calcula en el servidor a partir del
   * producto real, nunca se confía en el precio enviado por el cliente.
   *
   * @param {Object} payload
   *   tipo: 'Local' | 'Llevar'
   *   mesa_num: number|null
   *   user_id: number|null (usuario logueado que realiza el pedido, si aplica)
   *   cliente_nombre, cliente_wpp: string
   *   items: [{ product_id, cantidad, notas }]
   *   metodo_pago, observaciones: string
   *   creado_por_user_id: number|null (staff que tomó el pedido, si aplica)
   *
   * @return {Object} { success, message, pedido_id, numero_pedido, total }
   */
  create: function(payload) {
    if (!payload || !payload.items || !payload.items.length) {
      return { success: false, message: 'El pedido debe tener al menos un producto.' };
    }

    var tipo = CONFIG.TIPOS_PEDIDO.indexOf(payload.tipo) !== -1 ? payload.tipo : 'Local';

    if (tipo === 'Local' && payload.mesa_num) {
      var mesaExiste = Base_Model.all(CONFIG.DB.MESAS).some(function(m) {
        return String(m.mesa_num).trim() === String(payload.mesa_num).trim();
      });
      if (!mesaExiste) {
        return { success: false, message: 'La mesa indicada no existe.' };
      }
    }

    var productos = Base_Model.all(CONFIG.DB.PRODUCTOS);
    var lineas = [];
    var subtotal = 0;

    for (var i = 0; i < payload.items.length; i++) {
      var itemReq = payload.items[i];
      var producto = productos.find(function(p) {
        return String(p.product_id).trim() === String(itemReq.product_id).trim();
      });

      if (!producto) {
        return { success: false, message: 'Uno de los productos del pedido ya no existe.' };
      }

      var activo = producto.activo === true || producto.activo.toString().toUpperCase() === 'TRUE';
      if (!activo) {
        return { success: false, message: 'El producto "' + producto.nombre + '" no está disponible.' };
      }

      var cantidad = parseInt(itemReq.cantidad) || 1;
      if (cantidad <= 0) cantidad = 1;

      var precioUnitario = parseFloat(producto.precio) || 0;
      var lineaSubtotal = Math.round(precioUnitario * cantidad * 100) / 100;
      subtotal += lineaSubtotal;

      lineas.push({
        product_id: producto.product_id,
        nombre_producto: producto.nombre,
        cantidad: cantidad,
        precio_unitario: precioUnitario,
        subtotal: lineaSubtotal,
        notas: itemReq.notas || ''
      });
    }

    // Sin impuesto: el total del pedido es directamente el subtotal.
    // Cliente y servidor comparten esta misma regla de cálculo.
    var total = Math.round(subtotal * 100) / 100;

    var pedidoId = Base_Model.getNextId(CONFIG.DB.PEDIDOS);
    var numeroPedido = generarNumeroPedido();

    // 👇 Detecta si el pedido viene del invitado (rol TOTEM) y le agrega
    // un marcador [TOTEM] en observaciones para que cocina lo distinga
    // de un vistazo. Evita duplicar el marcador si ya viene con él.
    var esTotem = String(payload.user_id || '').trim() === String(CONFIG.GUEST.USER_ID).trim();
    var observacionesFinal = payload.observaciones || '';
    if (esTotem && observacionesFinal.indexOf('[TOTEM]') === -1) {
      observacionesFinal = ('[TOTEM] ' + observacionesFinal).trim();
    }

    var pedido = {
      pedido_id: pedidoId,
      numero_pedido: numeroPedido,
      fecha: new Date(),
      tipo: tipo,
      mesa_num: tipo === 'Local' ? (payload.mesa_num || '') : '',
      user_id: payload.user_id || '',
      cliente_nombre: payload.cliente_nombre || '',
      cliente_wpp: payload.cliente_wpp || '',
      estado: 'PENDIENTE',
      total: total,
      metodo_pago: payload.metodo_pago || '',
      observaciones: observacionesFinal,
      creado_por_user_id: payload.creado_por_user_id || ''
    };

    Base_Model.create(CONFIG.DB.PEDIDOS, pedido);

    for (var j = 0; j < lineas.length; j++) {
      var itemId = Base_Model.getNextId(CONFIG.DB.PEDIDO_ITEMS);
      lineas[j].item_id = itemId;
      lineas[j].pedido_id = pedidoId;
      Base_Model.create(CONFIG.DB.PEDIDO_ITEMS, lineas[j]);
    }

    // Si el pedido es en salón y hay mesa, se marca como ocupada
    if (tipo === 'Local' && pedido.mesa_num) {
      Base_Model.update(CONFIG.DB.MESAS, pedido.mesa_num, { estado: 'OCUPADA' });
    }

    return {
      success: true,
      message: '¡Pedido #' + numeroPedido + ' creado exitosamente!',
      pedido_id: pedidoId,
      numero_pedido: numeroPedido,
      subtotal: subtotal,
      total: total
    };
  },

  /**
   * Devuelve un pedido junto con sus líneas.
   */
  getWithItems: function(pedidoId) {
    var pedido = Base_Model.all(CONFIG.DB.PEDIDOS).find(function(p) {
      return String(p.pedido_id).trim() === String(pedidoId).trim();
    });

    if (!pedido) return null;

    pedido.items = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS).filter(function(it) {
      return String(it.pedido_id).trim() === String(pedidoId).trim();
    });

    return pedido;
  },

  /**
   * Devuelve todos los pedidos, cada uno con su arreglo de items adjunto.
   */
  getAllWithItems: function() {
    var pedidos = Base_Model.all(CONFIG.DB.PEDIDOS);
    var items = Base_Model.all(CONFIG.DB.PEDIDO_ITEMS);

    return pedidos.map(function(p) {
      p.items = items.filter(function(it) {
        return String(it.pedido_id).trim() === String(p.pedido_id).trim();
      });
      return p;
    }).sort(function(a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    });
  },


  /**
   * Cambia el estado de un pedido validando la transición.
   */
  setEstado: function(pedidoId, nuevoEstado) {
    if (CONFIG.ESTADOS_PEDIDO.indexOf(nuevoEstado) === -1) {
      return { success: false, message: 'Estado inválido' };
    }

    var pedido = Base_Model.all(CONFIG.DB.PEDIDOS).find(function(p) {
      return String(p.pedido_id).trim() === String(pedidoId).trim();
    });

    if (!pedido) {
      return { success: false, message: 'Pedido no encontrado' };
    }

    if (pedido.estado === 'ENTREGADO' || pedido.estado === 'CANCELADO') {
      return { success: false, message: 'Este pedido ya está cerrado y no se puede modificar.' };
    }

    Base_Model.update(CONFIG.DB.PEDIDOS, pedido.pedido_id, { estado: nuevoEstado });

    // Libera la mesa cuando el pedido finaliza o se cancela
    if ((nuevoEstado === 'ENTREGADO' || nuevoEstado === 'CANCELADO') && pedido.tipo === 'Local' && pedido.mesa_num) {
      var otrosActivos = Base_Model.all(CONFIG.DB.PEDIDOS).some(function(p) {
        return String(p.mesa_num).trim() === String(pedido.mesa_num).trim() &&
          String(p.pedido_id).trim() !== String(pedido.pedido_id).trim() &&
          ['ENTREGADO', 'CANCELADO'].indexOf(p.estado) === -1;
      });
      if (!otrosActivos) {
        Base_Model.update(CONFIG.DB.MESAS, pedido.mesa_num, { estado: 'LIBRE' });
      }
    }

    return { success: true, message: 'Estado del pedido actualizado a ' + nuevoEstado };
  }
};

globalThis.Pedido_Model = Pedido_Model;


