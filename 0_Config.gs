/**
 * 0_Config.gs
 * Configuración global del Framework GASVEL
 */

var CONFIG = {

  APP_NAME: 'GASVEL',

  SPREADSHEET_ID: "",

  DB: {
    USERS: 'USERS',
    ROLES: 'ROLES',
    CATEGORIAS: 'CATEGORIAS',
    PRODUCTOS: 'PRODUCTOS',
    MESAS: 'MESAS',
    PEDIDOS: 'PEDIDOS',
    PEDIDO_ITEMS: 'PEDIDO_ITEMS'
  },

  ROLES: {
    ADMIN: 1,
    MOZO: 2,
    COCINA: 3,
    CLIENTE: 4,
    TOTEM: 5
  },

  GUEST: {
    USER_ID: 9999,
    NOMBRE: 'Invitado',
    APELLIDO: 'Tótem',
    EMAIL: 'invitado@local',        // 👈 debe coincidir con la fila 9999 en USERS
    ROL_ID: 5,                       // TOTEM — debe coincidir con CONFIG.ROLES.TOTEM
    INACTIVITY_MS: 30000
  },

  ESTADOS_MESA: ['LIBRE', 'OCUPADA', 'RESERVADA'],

  ESTADOS_PEDIDO: ['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],

  TIPOS_PEDIDO: ['Local', 'Llevar']

};
