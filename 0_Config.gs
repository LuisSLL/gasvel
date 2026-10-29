/**
 * 0_Config.gs
 * Configuración global del Framework GASVEL
 *
 * Los roles ahora se identifican por CLAVES STRING en vez de números.
 * Esto evita colisiones si mañana agregás "SUPERVISOR", "REPARTIDOR", etc.
 * Los labels y las clases de badge están centralizados acá.
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
    PEDIDO_ITEMS: 'PEDIDO_ITEMS',
    CAJA: 'CAJA',                           // 👈 NUEVO
    CAJA_MOVIMIENTOS: 'CAJA_MOVIMIENTOS'    // 👈 NUEVO
  },

  // ─────────────────────────────────────────────
  // ROLES (identificadores string, NO números)
  // ─────────────────────────────────────────────
  ROLES: {
    ADMIN:   'admin',
    MOZO:    'mozo',
    COCINA:  'cocina',
    CLIENTE: 'cliente',
    TOTEM:   'totem'
  },

  // Nombres legibles para mostrar en la UI
  ROLE_LABELS: {
    'admin':   'Admin',
    'mozo':    'Mozo',
    'cocina':  'Cocina',
    'cliente': 'Cliente',
    'totem':   'Tótem'
  },

  // Clases CSS de badge (Bootstrap) por rol
  ROLE_BADGES: {
    'admin':   'badge-danger',
    'mozo':    'badge-info',
    'cocina':  'badge-warning',
    'cliente': 'badge-secondary',
    'totem':   'badge-dark'
  },

  // ─────────────────────────────────────────────
  // INVITADO / TÓTEM (sesión rápida sin credenciales)
  // ─────────────────────────────────────────────
  GUEST: {
    USER_ID: 9999,
    NOMBRE: 'Invitado',
    APELLIDO: 'Tótem',
    EMAIL: 'invitado@local',   // debe coincidir con la fila 9999 en USERS
    ROL_ID: 'totem',           // string — coincide con CONFIG.ROLES.TOTEM
    INACTIVITY_MS: 30000       // 30 segundos sin actividad
  },

  // ─────────────────────────────────────────────
  // ARCHIVO DE PEDIDOS
  // ─────────────────────────────────────────────
  ARCHIVO: {
    NOMBRE_SS: 'GASVEL_Archivo_Ventas'   // nombre del Spreadsheet de archivo
  },

  ESTADOS_MESA: ['LIBRE', 'OCUPADA', 'RESERVADA'],

  ESTADOS_PEDIDO: ['PENDIENTE', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],

  TIPOS_PEDIDO: ['Local', 'Llevar']

};
