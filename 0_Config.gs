/**
 * 0_Config.gs
 * Configuración global del Framework GASVEL
 */

var CONFIG = {

  APP_NAME: 'GASVEL',

  SPREADSHEET_ID: "1gC0AdQoG1rsQqCC50e09JP4FKlAfOT8WpgujowKobE0",

  DB: {
    USERS: 'USERS',
    ROLES: 'ROLES',
    CATEGORIAS: 'CATEGORIAS',
    PRODUCTOS: 'PRODUCTOS',
    MESAS: 'MESAS',
    PEDIDOS: 'PEDIDOS',
    PEDIDO_ITEMS: 'PEDIDO_ITEMS'
  },

  TAX_RATE: 0.10

};

function getConfig() {
  return CONFIG;
}
