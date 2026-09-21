/**
 * 8_Ctrl_Home.gs
 * Controlador del Home / POS (Versión dinámica)
 */

class Ctrl_Home extends Base_Controller {

  // index: Renderiza el Home con las categorías desde la base de datos
  index() {
    try {
      Logger.log('📢 Ctrl_Home@index ejecutado');

      var data = {
        title: 'POS - GASVEL Restaurante',
        restaurantName: 'GASVEL',
        tagline: 'Cocina & Barra',
        // ✅ AGREGADO: Traer categorías desde la hoja CATEGORIAS
        categorias: Base_Model.all(CONFIG.DB.CATEGORIAS)
      };

      return this.view('Home_Index', data, 'Layout_Main');
      
    } catch (error) {
      Logger.log('❌ Error: ' + error.message);
      return 'Error: ' + error.message;
    }
  }

  // Crear pedido (ejemplo de ruta pública)
  crearPedido(params) {
    return this.jsonResponse(true, 'Pedido creado', {
      numero_pedido: Math.floor(Math.random() * 1000) + 1
    });
  }
}

globalThis.Ctrl_Home = Ctrl_Home;
Logger.log('✅ Ctrl_Home (estático) registrado correctamente');
