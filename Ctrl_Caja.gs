/**
 * Ctrl_Caja.gs
 * Controlador del módulo de Caja.
 */

class Ctrl_Caja extends Base_Controller {

  // ==========================================
  // VISTA
  // ==========================================

  index() {
    if (!this._hasPermission('caja')) {
      return this._denyAccess();
    }

    var user = this._getSessionUser();
    if (!user) return this.redirect('login');

    var userId = user.user_id;
    var cajaAbierta = Caja_Model.getCajaAbierta(userId);
    var reporte = cajaAbierta ? Caja_Model.getReporte(cajaAbierta.id) : null;
    var historial = Caja_Model.getHistorial(userId, 20);

    return this.view('Dashboard_Caja', Object.assign({
      title: "Caja",
      activeMenu: "caja",
      cajaAbierta: cajaAbierta,
      reporte: reporte,
      historial: historial
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  // ==========================================
  // ABRIR / CERRAR
  // ==========================================

  abrir(data) {
    if (!this._hasPermission('caja')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var user = this._getSessionUser();
    if (!user) {
      return JSON.stringify({ success: false, message: 'Sesión expirada.' });
    }

    var result = Caja_Model.abrir(data || {}, user.user_id);

    // 👇 Devolver caja + reporte fresco para re-render en vivo
    if (result && result.success) {
      var cajaAbierta = Caja_Model.getCajaAbierta(user.user_id);
      result.caja = cajaAbierta;
      result.reporte = cajaAbierta ? Caja_Model.getReporte(cajaAbierta.id) : null;
    }

    return JSON.stringify(result);
  }

  cerrar(data) {
    if (!this._hasPermission('caja')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var user = this._getSessionUser();
    if (!user) {
      return JSON.stringify({ success: false, message: 'Sesión expirada.' });
    }

    var result = Caja_Model.cerrar(data || {}, user.user_id);

    // 👇 Devolver caja + reporte + historial para re-render en vivo
    if (result && result.success) {
      result.historial = Caja_Model.getHistorial(user.user_id, 20);
    }

    return JSON.stringify(result);
  }

  // ==========================================
  // MOVIMIENTOS
  // ==========================================

  agregarMovimiento(data) {
    if (!this._hasPermission('caja')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var user = this._getSessionUser();
    if (!user) {
      return JSON.stringify({ success: false, message: 'Sesión expirada.' });
    }

    var result = Caja_Model.agregarMovimiento(data || {}, user.user_id);

    // 👇 Devolver el movimiento + reporte actualizado
    if (result && result.success) {
      var cajaAbierta = Caja_Model.getCajaAbierta(user.user_id);
      if (cajaAbierta) {
        result.reporte = Caja_Model.getReporte(cajaAbierta.id);
        // El modelo puede devolver el movimiento creado o lo tomamos de los movimientos
        if (!result.movimiento && result.reporte && result.reporte.movimientos) {
          var movs = result.reporte.movimientos;
          result.movimiento = movs[movs.length - 1];
        }
      }
    }

    return JSON.stringify(result);
  }

  eliminarMovimiento(data) {
    if (!this._hasPermission('caja')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var user = this._getSessionUser();
    if (!user) {
      return JSON.stringify({ success: false, message: 'Sesión expirada.' });
    }

    if (!data || !data.movimiento_id) {
      return JSON.stringify({ success: false, message: 'Falta el ID del movimiento.' });
    }

    var result = Caja_Model.eliminarMovimiento(data.movimiento_id);

    // 👇 Devolver movimiento_id + reporte actualizado
    if (result && result.success) {
      result.movimiento_id = data.movimiento_id;
      var cajaAbierta = Caja_Model.getCajaAbierta(user.user_id);
      if (cajaAbierta) {
        result.reporte = Caja_Model.getReporte(cajaAbierta.id);
      }
    }

    return JSON.stringify(result);
  }

  // ==========================================
  // CONSULTAS
  // ==========================================

  getReporte(data) {
    if (!this._hasPermission('caja')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    var cajaId = (data && data.caja_id) || null;
    if (!cajaId) {
      var user = this._getSessionUser();
      var cajaAbierta = Caja_Model.getCajaAbierta(user.user_id);
      if (!cajaAbierta) {
        return JSON.stringify({ success: false, message: 'No hay caja abierta.' });
      }
      cajaId = cajaAbierta.id;
    }

    var reporte = Caja_Model.getReporte(cajaId);
    if (!reporte) {
      return JSON.stringify({ success: false, message: 'Caja no encontrada.' });
    }

    return JSON.stringify({ success: true, reporte: reporte });
  }
}

globalThis.Ctrl_Caja = Ctrl_Caja;

// Funciones puente
function abrirCaja(data) {
  var controller = new Ctrl_Caja();
  return controller.abrir(data);
}

function cerrarCaja(data) {
  var controller = new Ctrl_Caja();
  return controller.cerrar(data);
}

function agregarMovimientoCaja(data) {
  var controller = new Ctrl_Caja();
  return controller.agregarMovimiento(data);
}

function eliminarMovimientoCaja(data) {
  var controller = new Ctrl_Caja();
  return controller.eliminarMovimiento(data);
}

function getReporteCaja(data) {
  var controller = new Ctrl_Caja();
  return controller.getReporte(data);
}

Logger.log('✅ Ctrl_Caja registrado');
