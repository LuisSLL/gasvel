/**
 * Base_Caja.gs
 * Modelo con la lógica de negocio de la Caja.
 *
 * Reglas:
 *   - Cada cajero abre una caja con un monto inicial.
 *   - Los pedidos cobrados se registran automáticamente.
 *   - El cajero puede registrar movimientos manuales (ingresos/egresos).
 *   - Al cerrar, se calcula el total esperado vs. el real.
 *   - Solo puede haber UNA caja abierta por usuario a la vez.
 *   - Si no hay caja abierta, no se pueden cobrar pedidos.
 */

var Caja_Model = {

  // ==========================================
  // APERTURA / CIERRE
  // ==========================================

  /**
   * Abre una caja nueva para el usuario.
   * @param {Object} data — { monto_apertura, observaciones }
   * @param {number} userId — ID del cajero
   */
  abrir: function(data, userId) {
    if (!data || data.monto_apertura === undefined) {
      return { success: false, message: 'Falta el monto de apertura.' };
    }

    var monto = parseFloat(data.monto_apertura);
    if (isNaN(monto) || monto < 0) {
      return { success: false, message: 'El monto de apertura debe ser un número válido.' };
    }

    // Verificar que no haya otra caja abierta del mismo usuario
    var abierta = this.getCajaAbierta(userId);
    if (abierta) {
      return { success: false, message: 'Ya tenés una caja abierta. Cerrala antes de abrir otra.' };
    }

    var id = Base_Model.getNextId(CONFIG.DB.CAJA);
    var nueva = {
      id: id,
      fecha: new Date(),
      user_id: userId,
      tipo: 'APERTURA',
      monto: monto,
      observaciones: data.observaciones || '',
      creado: new Date()
    };

    Base_Model.create(CONFIG.DB.CAJA, nueva);

    return {
      success: true,
      message: '¡Caja abierta con $' + monto.toFixed(2) + '!',
      caja_id: id,
      monto_apertura: monto
    };
  },

  /**
   * Cierra la caja abierta del usuario.
   * @param {Object} data — { monto_cierre, observaciones }
   * @param {number} userId
   */
  cerrar: function(data, userId) {
    if (!data || data.monto_cierre === undefined) {
      return { success: false, message: 'Falta el monto de cierre.' };
    }

    var montoReal = parseFloat(data.monto_cierre);
    if (isNaN(montoReal) || montoReal < 0) {
      return { success: false, message: 'El monto de cierre debe ser un número válido.' };
    }

    var caja = this.getCajaAbierta(userId);
    if (!caja) {
      return { success: false, message: 'No tenés ninguna caja abierta.' };
    }

    var reporte = this.getReporte(caja.id);
    var montoEsperado = reporte.monto_esperado;
    var diferencia = Math.round((montoReal - montoEsperado) * 100) / 100;

    var id = Base_Model.getNextId(CONFIG.DB.CAJA);
    var cierre = {
      id: id,
      fecha: new Date(),
      user_id: userId,
      tipo: 'CIERRE',
      monto: montoReal,
      observaciones: (data.observaciones || '') + ' | Esperado: $' + montoEsperado.toFixed(2) + ' | Diferencia: $' + diferencia.toFixed(2),
      creado: new Date()
    };

    Base_Model.create(CONFIG.DB.CAJA, cierre);

    return {
      success: true,
      message: '¡Caja cerrada! Diferencia: $' + diferencia.toFixed(2),
      caja_id: caja.id,
      monto_esperado: montoEsperado,
      monto_real: montoReal,
      diferencia: diferencia
    };
  },

  // ==========================================
  // CONSULTAS
  // ==========================================

  /**
   * Devuelve la caja abierta del usuario (o null si no tiene).
   */
  getCajaAbierta: function(userId) {
    var cajas = Base_Model.all(CONFIG.DB.CAJA);

    // Ordenar por fecha desc para procesar de la más nueva a la más vieja
    cajas = cajas.slice().sort(function(a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    });

    // Buscar la última APERTURA del usuario que no tenga un CIERRE posterior
    var aperturas = cajas.filter(function(c) {
      return String(c.user_id).trim() === String(userId).trim() &&
             c.tipo === 'APERTURA';
    });

    for (var i = 0; i < aperturas.length; i++) {
      var apertura = aperturas[i];
      var cierrePosterior = cajas.find(function(c) {
        return String(c.user_id).trim() === String(userId).trim() &&
               c.tipo === 'CIERRE' &&
               new Date(c.fecha) > new Date(apertura.fecha);
      });
      if (!cierrePosterior) {
        return apertura;
      }
    }

    return null;
  },

  /**
   * Genera el reporte completo de una caja.
   */
  getReporte: function(cajaId) {
    var caja = Base_Model.all(CONFIG.DB.CAJA).find(function(c) {
      return String(c.id).trim() === String(cajaId).trim();
    });
    if (!caja) return null;

    // Movimientos manuales de esta caja
    var movimientos = Base_Model.all(CONFIG.DB.CAJA_MOVIMIENTOS).filter(function(m) {
      return String(m.caja_id).trim() === String(cajaId).trim();
    });

    // Pedidos cobrados durante el turno de esta caja
    // Consideramos "cobrados" a los pedidos creados después de la apertura
    // (y antes del cierre si ya se cerró).
    var cajas = Base_Model.all(CONFIG.DB.CAJA);
    var fechaCierre = cajas.find(function(c) {
      return String(c.user_id).trim() === String(caja.user_id).trim() &&
             c.tipo === 'CIERRE' &&
             new Date(c.fecha) > new Date(caja.fecha);
    });
    var fechaFin = fechaCierre ? new Date(fechaCierre.fecha) : new Date();

    var pedidos = Base_Model.all(CONFIG.DB.PEDIDOS).filter(function(p) {
      var f = new Date(p.fecha);
      return f >= new Date(caja.fecha) && f <= fechaFin;
    });

    // Desglose por método de pago
    var porMetodo = {};
    // Desglose por tipo de pedido
    var porTipo = { 'Local': 0, 'Llevar': 0 };

    var totalCobrado = 0;

    pedidos.forEach(function(p) {
      var total = parseFloat(p.total) || 0;
      totalCobrado += total;

      var metodo = (p.metodo_pago || 'Sin especificar').toString().trim() || 'Sin especificar';
      porMetodo[metodo] = (porMetodo[metodo] || 0) + total;

      var tipo = p.tipo || 'Local';
      porTipo[tipo] = (porTipo[tipo] || 0) + total;
    });

    // Movimientos manuales
    var totalIngresos = 0;
    var totalEgresos = 0;
    movimientos.forEach(function(m) {
      var monto = parseFloat(m.monto) || 0;
      if (m.tipo === 'INGRESO') totalIngresos += monto;
      else if (m.tipo === 'EGRESO') totalEgresos += monto;
    });

    var montoApertura = parseFloat(caja.monto) || 0;
    var montoEsperado = Math.round((montoApertura + totalCobrado + totalIngresos - totalEgresos) * 100) / 100;

    return {
      caja: caja,
      fecha_apertura: caja.fecha,
      fecha_cierre: fechaCierre ? fechaCierre.fecha : null,
      monto_apertura: montoApertura,
      total_cobrado: Math.round(totalCobrado * 100) / 100,
      total_ingresos: Math.round(totalIngresos * 100) / 100,
      total_egresos: Math.round(totalEgresos * 100) / 100,
      monto_esperado: montoEsperado,
      cantidad_pedidos: pedidos.length,
      por_metodo: porMetodo,
      por_tipo: porTipo,
      movimientos: movimientos,
      pedidos: pedidos,
      abierta: !fechaCierre
    };
  },

  /**
   * Devuelve todas las cajas del usuario (historial).
   */
  getHistorial: function(userId, limite) {
    limite = limite || 30;
    var cajas = Base_Model.all(CONFIG.DB.CAJA).filter(function(c) {
      return String(c.user_id).trim() === String(userId).trim();
    });

    cajas.sort(function(a, b) {
      return new Date(b.fecha) - new Date(a.fecha);
    });

    return cajas.slice(0, limite);
  },

  // ==========================================
  // MOVIMIENTOS MANUALES
  // ==========================================

  /**
   * Registra un movimiento manual (ingreso/egreso) en la caja abierta.
   */
  agregarMovimiento: function(data, userId) {
    if (!data || !data.tipo || data.monto === undefined) {
      return { success: false, message: 'Faltan datos (tipo, monto).' };
    }

    var tipo = String(data.tipo).toUpperCase();
    if (tipo !== 'INGRESO' && tipo !== 'EGRESO') {
      return { success: false, message: 'Tipo inválido (debe ser INGRESO o EGRESO).' };
    }

    var monto = parseFloat(data.monto);
    if (isNaN(monto) || monto <= 0) {
      return { success: false, message: 'El monto debe ser mayor a 0.' };
    }

    var caja = this.getCajaAbierta(userId);
    if (!caja) {
      return { success: false, message: 'No hay caja abierta. Abrí una primero.' };
    }

    var id = Base_Model.getNextId(CONFIG.DB.CAJA_MOVIMIENTOS);
    Base_Model.create(CONFIG.DB.CAJA_MOVIMIENTOS, {
      id: id,
      caja_id: caja.id,
      tipo: tipo,
      monto: monto,
      descripcion: data.descripcion || '',
      creado: new Date()
    });

    return {
      success: true,
      message: '¡Movimiento registrado!',
      movimiento_id: id
    };
  },

  /**
   * Elimina un movimiento manual.
   */
  eliminarMovimiento: function(movimientoId) {
    var mov = Base_Model.all(CONFIG.DB.CAJA_MOVIMIENTOS).find(function(m) {
      return String(m.id).trim() === String(movimientoId).trim();
    });
    if (!mov) {
      return { success: false, message: 'Movimiento no encontrado.' };
    }

    Base_Model.delete(CONFIG.DB.CAJA_MOVIMIENTOS, movimientoId);
    return { success: true, message: 'Movimiento eliminado.' };
  },

  // ==========================================
  // HELPERS PARA OTROS MÓDULOS
  // ==========================================

  /**
   * Verifica si un usuario tiene caja abierta.
   * Usado por `Ctrl_Pedidos` para bloquear cobros si no hay caja.
   */
  tieneCajaAbierta: function(userId) {
    return this.getCajaAbierta(userId) !== null;
  }

};

globalThis.Caja_Model = Caja_Model;

Logger.log('✅ Caja_Model cargado');
