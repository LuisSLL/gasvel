/**
 * Ctrl_Archivo.gs
 * Controlador del módulo de archivado de pedidos.
 *
 * Funciones:
 *   - archivarMes(): mueve los pedidos anteriores al mes actual a un
 *     Spreadsheet de archivo en Drive, y los borra del SS principal.
 *   - borrarTodo(): borra TODOS los pedidos y items del SS principal
 *     (sin respaldo). Requiere confirmación por texto.
 *   - getEstadoArchivado(): devuelve info para el Dashboard.
 *
 * No toca Base_Model ni Pedido_Model: hace lecturas/escrituras en batch
 * directamente sobre las hojas, para que archivar 5000 pedidos tarde
 * segundos y no minutos.
 */

class Ctrl_Archivo extends Base_Controller {

  // ==========================================
  // VISTA DEL MÓDULO
  // ==========================================

  /**
   * Renderiza la vista del módulo de archivado.
   * Solo ADMIN.
   */
  showArchivo() {
    Logger.log('==> [Ctrl_Archivo.showArchivo] Renderizando módulo de archivo...');

    if (!this._checkAdminPermission()) {
      Logger.log('⚠️ [Ctrl_Archivo.showArchivo] Acceso denegado.');
      return this._denyAccess();
    }

    var estado = this.getEstadoArchivado();

    return this.view('Archivo', Object.assign({
      title: "Archivo de Pedidos",
      activeMenu: "archivo",
      estado: estado
    }, this._getDashboardUserData()), 'Layout_Dashboard');
  }

  // ==========================================
  // ESTADO
  // ==========================================

  /**
   * Devuelve el estado actual del archivado para mostrar en la UI.
   */
  getEstadoArchivado() {
    try {
      var sheetPedidos = Base_Model.sheet(CONFIG.DB.PEDIDOS);
      var sheetItems = Base_Model.sheet(CONFIG.DB.PEDIDO_ITEMS);

      var filasPedidos = sheetPedidos ? Math.max(0, sheetPedidos.getLastRow() - 1) : 0;
      var filasItems = sheetItems ? Math.max(0, sheetItems.getLastRow() - 1) : 0;

      var props = PropertiesService.getScriptProperties();
      var ultimoArchivado = props.getProperty('ultimo_archivado') || '—';
      var archivoSsId = props.getProperty('archivo_ss_id') || '';

      var corte = this._fechaCorteMesActual();
      var hayViejos = this._contarPedidosAntesDe(corte);

      return {
        ok: true,
        filas_pedidos: filasPedidos,
        filas_items: filasItems,
        ultimo_archivado: ultimoArchivado,
        archivo_ss_id: archivoSsId,
        archivo_url: archivoSsId ? 'https://docs.google.com/spreadsheets/d/' + archivoSsId : '',
        corte_proximo: Utilities.formatDate(corte, Session.getScriptTimeZone(), 'dd/MM/yyyy'),
        hay_pedidos_viejos: hayViejos > 0,
        cantidad_a_archivar: hayViejos
      };
    } catch (err) {
      Logger.log('❌ [Ctrl_Archivo.getEstadoArchivado] ' + err.message);
      return { ok: false, message: err.message };
    }
  }

  // ==========================================
  // ARCHIVAR
  // ==========================================

  /**
   * Mueve pedidos anteriores al mes actual al SS de archivo.
   * Flujo: leer → filtrar → escribir en archivo → verificar → borrar del principal.
   */
  archivarMes() {
    Logger.log('==> [Ctrl_Archivo.archivarMes] Iniciando archivado...');

    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    try {
      var corte = this._fechaCorteMesActual();
      var corteStr = Utilities.formatDate(corte, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      Logger.log('   📅 Corte: pedidos anteriores a ' + corteStr);

      // --- 1. Leer PEDIDOS del SS principal ---
      var sheetPedidos = Base_Model.sheet(CONFIG.DB.PEDIDOS);
      if (!sheetPedidos) return { success: false, message: 'No existe la hoja PEDIDOS.' };

      var dataPedidos = sheetPedidos.getDataRange().getValues();
      if (dataPedidos.length < 2) {
        return { success: false, message: 'No hay pedidos en la tabla.' };
      }
      var headersPedidos = dataPedidos[0];
      var idxFecha = headersPedidos.indexOf('fecha');
      var idxPedidoId = headersPedidos.indexOf('pedido_id');
      if (idxFecha === -1 || idxPedidoId === -1) {
        return { success: false, message: 'La tabla PEDIDOS no tiene columnas fecha/pedido_id.' };
      }

      // --- 2. Filtrar filas viejas ---
      var filasViejas = [];
      var pedidosViejos = [];
      var idsViejos = {};

      for (var i = 1; i < dataPedidos.length; i++) {
        var fechaRaw = dataPedidos[i][idxFecha];
        var fecha = fechaRaw instanceof Date ? fechaRaw : new Date(fechaRaw);
        if (isNaN(fecha.getTime())) continue;
        if (fecha < corte) {
          filasViejas.push(i + 1);
          var obj = {};
          for (var h = 0; h < headersPedidos.length; h++) {
            obj[headersPedidos[h]] = dataPedidos[i][h];
          }
          pedidosViejos.push(obj);
          idsViejos[String(obj.pedido_id).trim()] = true;
        }
      }

      if (pedidosViejos.length === 0) {
        return { success: false, message: 'No hay pedidos anteriores al mes actual para archivar.' };
      }

      Logger.log('   📦 Pedidos a archivar: ' + pedidosViejos.length);

      // --- 3. Leer PEDIDO_ITEMS y filtrar por pedido_id ---
      var sheetItems = Base_Model.sheet(CONFIG.DB.PEDIDO_ITEMS);
      if (!sheetItems) return { success: false, message: 'No existe la hoja PEDIDO_ITEMS.' };

      var dataItems = sheetItems.getDataRange().getValues();
      var headersItems = dataItems.length > 0 ? dataItems[0] : [];
      var idxPedidoIdItem = headersItems.indexOf('pedido_id');

      var filasItemsViejas = [];
      var itemsViejos = [];

      if (idxPedidoIdItem !== -1) {
        for (var j = 1; j < dataItems.length; j++) {
          var pidItem = String(dataItems[j][idxPedidoIdItem]).trim();
          if (idsViejos[pidItem]) {
            filasItemsViejas.push(j + 1);
            var objItem = {};
            for (var k = 0; k < headersItems.length; k++) {
              objItem[headersItems[k]] = dataItems[j][k];
            }
            itemsViejos.push(objItem);
          }
        }
      }

      Logger.log('   📦 Items a archivar: ' + itemsViejos.length);

      // --- 4. Crear/obtener SS de archivo ---
      var archivoSS = this._obtenerOCrearArchivoSS();

      // --- 5. Escribir en el archivo ---
      var sufijo = Utilities.formatDate(corte, Session.getScriptTimeZone(), 'yyyy_MM');
      var nombreHojaPedidos = 'PEDIDOS_' + sufijo;
      var nombreHojaItems = 'PEDIDO_ITEMS_' + sufijo;

      this._escribirEnArchivo(archivoSS, nombreHojaPedidos, headersPedidos, pedidosViejos);
      this._escribirEnArchivo(archivoSS, nombreHojaItems, headersItems, itemsViejos);

      // --- 6. Verificar ---
      var verificacionPedidos = this._contarFilas(archivoSS, nombreHojaPedidos);
      var verificacionItems = this._contarFilas(archivoSS, nombreHojaItems);

      if (verificacionPedidos < pedidosViejos.length || verificacionItems < itemsViejos.length) {
        Logger.log('❌ Verificación falló: pedidos=' + verificacionPedidos + '/' + pedidosViejos.length);
        return {
          success: false,
          message: 'Verificación falló. No se borró nada del principal. Verificá el SS de archivo.'
        };
      }

      // --- 7. Borrar del principal (batch, de abajo hacia arriba) ---
      this._borrarFilasBatch(sheetItems, filasItemsViejas);
      this._borrarFilasBatch(sheetPedidos, filasViejas);

      // --- 8. Guardar estado ---
      var props = PropertiesService.getScriptProperties();
      props.setProperty('ultimo_archivado', Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm'));
      props.setProperty('archivo_ss_id', archivoSS.getId());

      Logger.log('✅ [Ctrl_Archivo.archivarMes] Archivado completo.');

      return {
        success: true,
        message: 'Archivados ' + pedidosViejos.length + ' pedidos y ' + itemsViejos.length + ' items.',
        pedidos_archivados: pedidosViejos.length,
        items_archivados: itemsViejos.length,
        archivo_url: 'https://docs.google.com/spreadsheets/d/' + archivoSS.getId(),
        hoja_pedidos: nombreHojaPedidos,
        hoja_items: nombreHojaItems
      };

    } catch (err) {
      Logger.log('❌ [Ctrl_Archivo.archivarMes] ' + err.message);
      Logger.log('Stack: ' + err.stack);
      return { success: false, message: 'Error al archivar: ' + err.message };
    }
  }

  // ==========================================
  // BORRAR TODO (destructivo)
  // ==========================================

  /**
   * Borra TODOS los pedidos y items del SS principal, SIN respaldo.
   * Requiere confirmarToken = "BORRAR_TODO" desde el cliente.
   */
  borrarTodo(confirmarToken) {
    Logger.log('==> [Ctrl_Archivo.borrarTodo] Iniciando...');

    if (!this._checkAdminPermission()) {
      return { success: false, message: 'No autorizado.' };
    }

    if (String(confirmarToken || '').trim() !== 'BORRAR_TODO') {
      return { success: false, message: 'Token de confirmación inválido.' };
    }

    try {
      var sheetPedidos = Base_Model.sheet(CONFIG.DB.PEDIDOS);
      var sheetItems = Base_Model.sheet(CONFIG.DB.PEDIDO_ITEMS);

      var borradosP = this._borrarTodasLasFilas(sheetPedidos);
      var borradosI = this._borrarTodasLasFilas(sheetItems);

      PropertiesService.getScriptProperties().setProperty(
        'ultimo_borrado_total',
        Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
      );

      Logger.log('⚠️ Borrado total: ' + borradosP + ' pedidos, ' + borradosI + ' items.');

      return {
        success: true,
        message: 'Borrados ' + borradosP + ' pedidos y ' + borradosI + ' items.',
        pedidos_borrados: borradosP,
        items_borrados: borradosI
      };

    } catch (err) {
      Logger.log('❌ [Ctrl_Archivo.borrarTodo] ' + err.message);
      return { success: false, message: 'Error: ' + err.message };
    }
  }

  // ==========================================
  // HELPERS PRIVADOS
  // ==========================================

  _fechaCorteMesActual() {
    var hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1, 0, 0, 0);
  }

  _contarPedidosAntesDe(corte) {
    var sheet = Base_Model.sheet(CONFIG.DB.PEDIDOS);
    if (!sheet) return 0;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return 0;
    var headers = data[0];
    var idxFecha = headers.indexOf('fecha');
    if (idxFecha === -1) return 0;

    var count = 0;
    for (var i = 1; i < data.length; i++) {
      var fecha = data[i][idxFecha] instanceof Date ? data[i][idxFecha] : new Date(data[i][idxFecha]);
      if (!isNaN(fecha.getTime()) && fecha < corte) count++;
    }
    return count;
  }

  _obtenerOCrearArchivoSS() {
    var props = PropertiesService.getScriptProperties();
    var idGuardado = props.getProperty('archivo_ss_id');

    if (idGuardado) {
      try {
        return SpreadsheetApp.openById(idGuardado);
      } catch (e) {
        Logger.log('⚠️ El SS de archivo guardado ya no existe, se creará uno nuevo.');
      }
    }

    var nombre = CONFIG.ARCHIVO.NOMBRE_SS || 'GASVEL_Archivo_Ventas';
    var nuevo = SpreadsheetApp.create(nombre);
    Logger.log('📁 SS de archivo creado: ' + nuevo.getId());

    try {
      var principalId = CONFIG.SPREADSHEET_ID;
      if (principalId) {
        var principalFile = DriveApp.getFileById(principalId);
        var carpetas = principalFile.getParents();
        if (carpetas.hasNext()) {
          var carpeta = carpetas.next();
          DriveApp.getFileById(nuevo.getId()).moveTo(carpeta);
          Logger.log('📁 SS movido a la carpeta del principal.');
        }
      }
    } catch (e) {
      Logger.log('⚠️ No se pudo mover a la carpeta del principal: ' + e.message);
    }

    props.setProperty('archivo_ss_id', nuevo.getId());
    return nuevo;
  }

  _escribirEnArchivo(ss, nombreHoja, headers, filas) {
    var sheet = ss.getSheetByName(nombreHoja);

    if (!sheet) {
      sheet = ss.insertSheet(nombreHoja);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }

    if (filas.length === 0) return;

    var valores = filas.map(function(obj) {
      return headers.map(function(h) { return obj[h] !== undefined ? obj[h] : ''; });
    });

    var filaInicio = sheet.getLastRow() + 1;
    sheet.getRange(filaInicio, 1, valores.length, headers.length).setValues(valores);
  }

  _contarFilas(ss, nombreHoja) {
    var sheet = ss.getSheetByName(nombreHoja);
    if (!sheet) return 0;
    return Math.max(0, sheet.getLastRow() - 1);
  }

  _borrarFilasBatch(sheet, filas1Based) {
    if (!filas1Based || filas1Based.length === 0) return;

    var ordenadas = filas1Based.slice().sort(function(a, b) { return b - a; });

    var inicio = ordenadas[0];
    var cantidad = 1;

    for (var i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i] === inicio - cantidad) {
        cantidad++;
      } else {
        sheet.deleteRows(inicio - cantidad + 1, cantidad);
        inicio = ordenadas[i];
        cantidad = 1;
      }
    }
    sheet.deleteRows(inicio - cantidad + 1, cantidad);
  }

  _borrarTodasLasFilas(sheet) {
    if (!sheet) return 0;
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return 0;
    var cantidad = lastRow - 1;
    sheet.deleteRows(2, cantidad);
    return cantidad;
  }
}

globalThis.Ctrl_Archivo = Ctrl_Archivo;

// ==========================================
// FUNCIONES PUENTE PARA google.script.run
// ==========================================

function getEstadoArchivado() {
  var controller = new Ctrl_Archivo();
  return JSON.stringify(controller.getEstadoArchivado());
}

function archivarMes() {
  var controller = new Ctrl_Archivo();
  return JSON.stringify(controller.archivarMes());
}

function borrarTodo(confirmarToken) {
  var controller = new Ctrl_Archivo();
  return JSON.stringify(controller.borrarTodo(confirmarToken));
}
