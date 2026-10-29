/**
 * 8_Ctrl_Home.gs
 * Controlador del Home / POS (Versión dinámica)
 */

class Ctrl_Home extends Base_Controller {

  // index: Renderiza el Home con categorías, productos y mesas desde la BD
  index() {
    try {
      Logger.log('📢 Ctrl_Home@index ejecutado');

      var productosActivos = Base_Model.all(CONFIG.DB.PRODUCTOS).filter(function(p) {
        return p.activo === true || p.activo.toString().toUpperCase() === 'TRUE';
      });

      var mesasLibres = Base_Model.all(CONFIG.DB.MESAS).filter(function(m) {
        var activa = m.activo === true || m.activo.toString().toUpperCase() === 'TRUE';
        return activa && m.estado === 'LIBRE';
      });

      var userProps = PropertiesService.getUserProperties();
      var isGuest = userProps.getProperty('isGuest') === 'true';

      var data = {
        title: 'POS - GASVEL Restaurante',
        restaurantName: 'GASVEL',
        tagline: 'Cocina & Barra',
        isHome: true,
        categorias: Base_Model.all(CONFIG.DB.CATEGORIAS),
        productos: productosActivos,
        mesas: mesasLibres,
        isGuest: isGuest,
        scriptUrl: getWebAppUrl()
      };

      return this.view('Home_Index', data, 'Layout_Main');

    } catch (error) {
      Logger.log('❌ Error: ' + error.message);
      return 'Error: ' + error.message;
    }
  }

  /**
   * Crea un pedido real desde el POS público / cliente.
   * Requiere sesión activa: el pedido NO se crea si no hay usuario logueado,
   * sin importar lo que diga el cliente (chequeo real, no solo visual).
   * @param {Object} params
   *   tipo: 'Local' | 'Llevar'
   *   mesa_num: number|string
   *   cliente_nombre, cliente_wpp: string
   *   items: string JSON con [{product_id, cantidad, notas}]
   *   metodo_pago, observaciones: string
   */
  crearPedido(params) {
    try {
      if (!params) params = {};

      var sessionUser = this._getSessionUser();
      if (!sessionUser) {
        return this.jsonResponse(false, 'Debés iniciar sesión para procesar un pedido.', { requiresLogin: true });
      }

      var items = params.items;
      if (typeof items === 'string') {
        items = JSON.parse(items);
      }

      // El pedido del POS siempre lo genera un usuario logueado: si no
      // mandó nombre/whatsapp propios, usamos los datos de su cuenta en
      // vez de dejar "N/A" en el ticket/detalle.
      var nombreSesion = ((sessionUser.nombre || '') + ' ' + (sessionUser.apellido || '')).trim();

      var result = Pedido_Model.create({
        tipo: params.tipo,
        mesa_num: params.mesa_num,
        user_id: sessionUser.user_id,
        cliente_nombre: params.cliente_nombre || nombreSesion,
        cliente_wpp: params.cliente_wpp || sessionUser.wpp || '',
        items: items,
        metodo_pago: params.metodo_pago || '',
        observaciones: params.observaciones || ''
      });

      return this.jsonResponse(result.success, result.message, {
        pedido_id: result.pedido_id,
        numero_pedido: result.numero_pedido,
        subtotal: result.subtotal,
        total: result.total
      });

    } catch (error) {
      Logger.log('❌ Error crearPedido: ' + error.message);
      return this.jsonResponse(false, 'Error al crear el pedido: ' + error.message);
    }
  }
}

globalThis.Ctrl_Home = Ctrl_Home;

// Puente para google.script.run (el POS llama a esta función global)
function crearPedidoCliente(params) {
  var controller = new Ctrl_Home();
  return controller.crearPedido(params);
}

Logger.log('✅ Ctrl_Home (dinámico) registrado correctamente');

