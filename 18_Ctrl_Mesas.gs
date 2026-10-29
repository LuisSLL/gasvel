/**
 * Controlador de Mesas
 * Archivo: 18_Ctrl_Mesas.gs
 *
 * Ver mesas: cualquiera con permiso 'mesas'.
 * Cambiar estado: cualquiera con permiso 'mesas'.
 * Crear/Editar/Eliminar: admin.
 */

class Ctrl_Mesas extends Base_Controller {

  index() {
    if (!this._hasPermission('mesas')) {
      return this._denyAccess();
    }

    return this.view('Dashboard_Mesas', Object.assign({
      title: "Gestión de Mesas",
      activeMenu: "mesas",
      mesas: Base_Model.all(CONFIG.DB.MESAS),
      estados: CONFIG.ESTADOS_MESA
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  create(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.mesa_num) {
      return JSON.stringify({ success: false, message: 'El número de mesa es obligatorio' });
    }

    var mesaNum = parseInt(data.mesa_num);
    if (isNaN(mesaNum) || mesaNum <= 0) {
      return JSON.stringify({ success: false, message: 'Número de mesa inválido' });
    }

    var existing = Base_Model.all(CONFIG.DB.MESAS).find(function(m) {
      return String(m.mesa_num).trim() === String(mesaNum).trim();
    });

    if (existing) {
      return JSON.stringify({ success: false, message: 'Ya existe una mesa con ese número' });
    }

    var nueva = {
      mesa_num: mesaNum,
      capacidad: data.capacidad ? parseInt(data.capacidad) : 4,
      estado: 'LIBRE',
      qr_url: data.qr_url || '',
      activo: true
    };

    Base_Model.create(CONFIG.DB.MESAS, nueva);

    // 👇 Devolver la mesa creada para pintarla en vivo
    return JSON.stringify({
      success: true,
      message: '¡Mesa creada!',
      mesa: nueva
    });
  }

  update(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.mesa_num) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var mesa = Base_Model.all(CONFIG.DB.MESAS).find(function(m) {
      return String(m.mesa_num).trim() === String(data.mesa_num).trim();
    });

    if (!mesa) {
      return JSON.stringify({ success: false, message: 'Mesa no encontrada' });
    }

    var updated = {
      mesa_num: mesa.mesa_num,
      capacidad: data.capacidad ? parseInt(data.capacidad) : mesa.capacidad,
      estado: data.estado || mesa.estado,
      qr_url: data.qr_url !== undefined ? data.qr_url : mesa.qr_url,
      activo: data.activo !== undefined ? (data.activo === true || data.activo === 'true') : mesa.activo
    };

    Base_Model.update(CONFIG.DB.MESAS, mesa.mesa_num, updated);

    // 👇 Devolver la mesa actualizada
    return JSON.stringify({
      success: true,
      message: '¡Mesa actualizada!',
      mesa: updated
    });
  }

  setEstado(data) {
    if (!this._hasPermission('mesas')) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.mesa_num || !data.estado) {
      return JSON.stringify({ success: false, message: 'Datos incompletos' });
    }

    if (CONFIG.ESTADOS_MESA.indexOf(data.estado) === -1) {
      return JSON.stringify({ success: false, message: 'Estado inválido' });
    }

    var mesa = Base_Model.all(CONFIG.DB.MESAS).find(function(m) {
      return String(m.mesa_num).trim() === String(data.mesa_num).trim();
    });

    if (!mesa) {
      return JSON.stringify({ success: false, message: 'Mesa no encontrada' });
    }

    Base_Model.update(CONFIG.DB.MESAS, mesa.mesa_num, { estado: data.estado });

    // 👇 Devolver mesa_num + estado nuevo
    return JSON.stringify({
      success: true,
      message: 'Estado de mesa actualizado',
      mesa_num: mesa.mesa_num,
      estado: data.estado
    });
  }

  delete(data) {
    if (!this._checkAdminPermission()) {
      return JSON.stringify({ success: false, message: 'No autorizado' });
    }

    if (!data || !data.mesa_num) {
      return JSON.stringify({ success: false, message: 'ID inválido' });
    }

    var enUso = Base_Model.all(CONFIG.DB.PEDIDOS).some(function(p) {
      return String(p.mesa_num).trim() === String(data.mesa_num).trim() &&
        ['ENTREGADO', 'CANCELADO'].indexOf(p.estado) === -1;
    });

    if (enUso) {
      return JSON.stringify({ success: false, message: 'No se puede eliminar: la mesa tiene pedidos activos.' });
    }

    Base_Model.delete(CONFIG.DB.MESAS, data.mesa_num);

    // 👇 Devolver mesa_num eliminado
    return JSON.stringify({
      success: true,
      message: '¡Mesa eliminada!',
      mesa_num: data.mesa_num
    });
  }
}

globalThis.Ctrl_Mesas = Ctrl_Mesas;

// Funciones puente
function createMesa(data) {
  var controller = new Ctrl_Mesas();
  return controller.create(data);
}

function updateMesa(data) {
  var controller = new Ctrl_Mesas();
  return controller.update(data);
}

function setEstadoMesa(data) {
  var controller = new Ctrl_Mesas();
  return controller.setEstado(data);
}

function deleteMesa(data) {
  var controller = new Ctrl_Mesas();
  return controller.delete(data);
}
