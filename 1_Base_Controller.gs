/**
 * 1_Base_Controller.gs
 * Controlador base del Framework GASVEL
 */

class Base_Controller {

  /**
   * Renderizado con Layout
   *
   * @param {string} viewName
   * @param {Object} data
   * @param {string} layout
   */
  view(viewName, data = {}, layout = 'Layout_Main') {
    return View.render(viewName, data, layout);
  }


  /**
   * Genera una respuesta JSON estándar
   *
   * @param {boolean} success
   * @param {string} message
   * @param {Object|string} extra
   */
  jsonResponse(success, message, extra = {}) {

    // Si extra es un string,
    // lo tratamos como nombre de ruta.
    if (typeof extra === 'string') {

      const routeName = extra;

      extra = {
        url: WebApp.url(routeName),
        redirect: !!routeName,
        route: routeName
      };
    }


    // Refrescar la URL actual
    if (success && !extra.url && extra.refresh) {
      extra.url = WebApp.url();
    }


    return {
      success: success,
      message: message,
      timestamp: new Date().getTime(),
      ...extra
    };
  }
}


// Registro global
globalThis.Base_Controller = Base_Controller;
