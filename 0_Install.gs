/**
 * 0_Install.gs
 * Script de instalación del sistema GASVEL Restaurante
 *
 * Roles ahora se identifican por CLAVES STRING ('admin', 'mozo', 'cocina',
 * 'cliente', 'totem'). Cada rol tiene una columna PERMISOS con las vistas
 * que puede ver (separados por coma). El install es idempotente.
 *
 * Incluye el módulo de CAJA (apertura/cierre de caja por turno).
 */

function install() {
  try {
    Logger.log('🚀 Iniciando instalación GASVEL Restaurante...');

    var ss = Base_Model.getSpreadsheet();
    Logger.log('📊 Spreadsheet ID: ' + ss.getId());

    // ============================================
    // 1. CREAR TABLAS
    // ============================================

    Logger.log('📋 Creando tablas...');

    Base_Model.createTable(CONFIG.DB.ROLES, [
      'rol_id', 'nombre', 'descripcion', 'permisos'
    ]);

    Base_Model.createTable(CONFIG.DB.USERS, [
      'user_id', 'nombre', 'apellido', 'email', 'telefono', 'wpp',
      'rol_id', 'pass_hash', 'activo', 'fecha_registro'
    ]);

    Base_Model.createTable(CONFIG.DB.CATEGORIAS, [
      'cat_id', 'nombre', 'descripcion', 'activo'
    ]);

    Base_Model.createTable(CONFIG.DB.PRODUCTOS, [
      'product_id', 'nombre', 'descripcion', 'precio', 'cat_id',
      'imagen_url', 'activo', 'tiempo_preparacion', 'stock_control', 'stock_actual'
    ]);

    Base_Model.createTable(CONFIG.DB.MESAS, [
      'mesa_num', 'capacidad', 'estado', 'qr_url', 'activo'
    ]);

    Base_Model.createTable(CONFIG.DB.PEDIDOS, [
      'pedido_id', 'numero_pedido', 'fecha', 'tipo', 'mesa_num',
      'user_id', 'cliente_nombre', 'cliente_wpp', 'estado', 'total',
      'metodo_pago', 'observaciones', 'creado_por_user_id'
    ]);

    Base_Model.createTable(CONFIG.DB.PEDIDO_ITEMS, [
      'item_id', 'pedido_id', 'product_id', 'nombre_producto',
      'cantidad', 'precio_unitario', 'subtotal', 'notas'
    ]);

    // 👈 NUEVO: tablas de Caja
    Base_Model.createTable(CONFIG.DB.CAJA, [
      'id', 'fecha', 'user_id', 'tipo', 'monto', 'observaciones', 'creado'
    ]);

    Base_Model.createTable(CONFIG.DB.CAJA_MOVIMIENTOS, [
      'id', 'caja_id', 'tipo', 'monto', 'descripcion', 'creado'
    ]);

    Logger.log('✅ Tablas creadas correctamente');

    // ============================================
    // 2. DATOS INICIALES - ROLES
    // ============================================

    Logger.log('📋 Insertando roles...');

    var rolesBase = [
      {
        rol_id: CONFIG.ROLES.ADMIN,
        nombre: 'ADMIN',
        descripcion: 'Administrador del sistema',
        permisos: 'pedidos,mesas,productos,categorias,usuarios,roles,caja,archivo,facturacion,configuracion'
      },
      {
        rol_id: CONFIG.ROLES.MOZO,
        nombre: 'MOZO',
        descripcion: 'Mozo / Toma pedidos en salón',
        permisos: 'pedidos,mesas'
      },
      {
        rol_id: CONFIG.ROLES.COCINA,
        nombre: 'COCINA',
        descripcion: 'Cocinero / Preparación',
        permisos: 'pedidos'
      },
      {
        rol_id: CONFIG.ROLES.CLIENTE,
        nombre: 'CLIENTE',
        descripcion: 'Cliente registrado',
        permisos: ''
      },
      {
        rol_id: CONFIG.ROLES.TOTEM,
        nombre: 'TOTEM',
        descripcion: 'Invitado para pedidos rápidos desde mostrador',
        permisos: ''
      }
    ];

    var rolesExistentes = Base_Model.all(CONFIG.DB.ROLES);
    var idsExistentes = rolesExistentes.map(function(r) {
      return String(r.rol_id || '').trim().toLowerCase();
    });

    rolesBase.forEach(function(r) {
      if (idsExistentes.indexOf(String(r.rol_id).toLowerCase()) === -1) {
        Base_Model.create(CONFIG.DB.ROLES, r);
        Logger.log('   ✅ Rol insertado: ' + r.rol_id);
      } else {
        Logger.log('   ℹ️ Rol ya existe: ' + r.rol_id);
      }
    });

    // ============================================
    // 3. MIGRACIÓN: columna 'permisos' + permiso 'caja'
    // ============================================

    migrarRolesConPermisos();

    // ============================================
    // 4. DATOS INICIALES - USUARIOS
    // ============================================

    Logger.log('📋 Creando usuarios base...');

    var users = Base_Model.all(CONFIG.DB.USERS);

    // --- Admin ---
    var adminEmail = 'admin@restaurante.com';
    var adminExiste = users.some(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === adminEmail;
    });

    if (!adminExiste) {
      var hashAdmin = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'admin123')
        .map(function(b) {
          return ('0' + (b & 0xFF).toString(16)).slice(-2);
        })
        .join('');

      Base_Model.create(CONFIG.DB.USERS, {
        user_id: 1,
        nombre: 'Administrador',
        apellido: 'Sistema',
        email: adminEmail,
        telefono: '555-1234',
        wpp: '555-1234',
        rol_id: CONFIG.ROLES.ADMIN,
        pass_hash: hashAdmin,
        activo: true,
        fecha_registro: new Date()
      });
      Logger.log('✅ Usuario admin creado (' + adminEmail + ' / admin123)');
    } else {
      Logger.log('ℹ️ Usuario admin ya existe');
    }

    // --- Invitado / Tótem ---
    var guestEmail = CONFIG.GUEST.EMAIL;
    var guestExiste = users.some(function(u) {
      return u.email && u.email.toString().trim().toLowerCase() === guestEmail.toLowerCase();
    });

    if (!guestExiste) {
      var randomPass = Utilities.getUuid() + Utilities.getUuid();
      var hashGuest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, randomPass)
        .map(function(b) {
          return ('0' + (b & 0xFF).toString(16)).slice(-2);
        })
        .join('');

      Base_Model.create(CONFIG.DB.USERS, {
        user_id: CONFIG.GUEST.USER_ID,
        nombre: CONFIG.GUEST.NOMBRE,
        apellido: CONFIG.GUEST.APELLIDO,
        email: CONFIG.GUEST.EMAIL,
        telefono: '',
        wpp: '',
        rol_id: CONFIG.GUEST.ROL_ID,
        pass_hash: hashGuest,
        activo: true,
        fecha_registro: new Date()
      });
      Logger.log('✅ Usuario invitado/TÓTEM creado');
    } else {
      Logger.log('ℹ️ Usuario invitado/TÓTEM ya existe');
    }

    // ============================================
    // 5. DATOS INICIALES - MESAS
    // ============================================

    Logger.log('📋 Creando mesas...');

    var mesas = Base_Model.all(CONFIG.DB.MESAS);
    if (mesas.length === 0) {
      for (var i = 1; i <= 10; i++) {
        var capacidad = i <= 4 ? 4 : (i <= 8 ? 6 : 8);
        Base_Model.create(CONFIG.DB.MESAS, {
          mesa_num: i,
          capacidad: capacidad,
          estado: 'LIBRE',
          activo: true
        });
      }
      Logger.log('✅ 10 mesas creadas');
    } else {
      Logger.log('ℹ️ Mesas ya existen');
    }

    // ============================================
    // 6. DATOS INICIALES - CATEGORÍAS
    // ============================================

    Logger.log('📋 Creando categorías...');

    var categorias = Base_Model.all(CONFIG.DB.CATEGORIAS);
    if (categorias.length === 0) {
      Base_Model.create(CONFIG.DB.CATEGORIAS, { cat_id: 1, nombre: 'HAMBURGUESAS', descripcion: 'Nuestras mejores hamburguesas', activo: true });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { cat_id: 2, nombre: 'PIZZAS', descripcion: 'Pizzas artesanales al horno', activo: true });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { cat_id: 3, nombre: 'BEBIDAS', descripcion: 'Bebidas frías y calientes', activo: true });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { cat_id: 4, nombre: 'POSTRES', descripcion: 'Dulces y postres caseros', activo: true });
      Logger.log('✅ Categorías insertadas');
    } else {
      Logger.log('ℹ️ Categorías ya existen');
    }

    // ============================================
    // 7. DATOS INICIALES - PRODUCTOS
    // ============================================

    Logger.log('📋 Creando productos...');

    var productos = Base_Model.all(CONFIG.DB.PRODUCTOS);
    if (productos.length === 0) {
      var productosData = [
        { product_id: 1, nombre: 'Hamburguesa Clásica', descripcion: 'Con queso, lechuga y tomate', precio: 12.50, cat_id: 1, activo: true },
        { product_id: 2, nombre: 'Hamburguesa BBQ', descripcion: 'Con cebolla caramelizada y salsa BBQ', precio: 14.00, cat_id: 1, activo: true },
        { product_id: 3, nombre: 'Hamburguesa Doble', descripcion: 'Doble carne, queso cheddar y bacon', precio: 16.00, cat_id: 1, activo: true },
        { product_id: 4, nombre: 'Pizza Margherita', descripcion: 'Salsa de tomate, mozzarella y albahaca', precio: 18.00, cat_id: 2, activo: true },
        { product_id: 5, nombre: 'Pizza Pepperoni', descripcion: 'Salsa de tomate, mozzarella y pepperoni', precio: 20.00, cat_id: 2, activo: true },
        { product_id: 6, nombre: 'Pizza 4 Quesos', descripcion: 'Mozzarella, gorgonzola, parmesano y provolone', precio: 22.00, cat_id: 2, activo: true },
        { product_id: 7, nombre: 'Coca Cola', descripcion: 'Lata 355ml', precio: 3.00, cat_id: 3, activo: true },
        { product_id: 8, nombre: 'Agua Mineral', descripcion: 'Botella 500ml', precio: 2.50, cat_id: 3, activo: true },
        { product_id: 9, nombre: 'Jugo Natural', descripcion: 'Naranja recién exprimido', precio: 4.00, cat_id: 3, activo: true },
        { product_id: 10, nombre: 'Flan Casero', descripcion: 'Con dulce de leche y crema', precio: 5.00, cat_id: 4, activo: true },
        { product_id: 11, nombre: 'Helado de Vainilla', descripcion: 'Bola de helado artesanal', precio: 4.50, cat_id: 4, activo: true },
        { product_id: 12, nombre: 'Brownie con Helado', descripcion: 'Brownie de chocolate con helado de vainilla', precio: 6.50, cat_id: 4, activo: true }
      ];

      for (var i = 0; i < productosData.length; i++) {
        Base_Model.create(CONFIG.DB.PRODUCTOS, productosData[i]);
      }
      Logger.log('✅ ' + productosData.length + ' productos insertados');
    } else {
      Logger.log('ℹ️ Productos ya existen');
    }

    // ============================================
    // 8. FINALIZAR
    // ============================================

    Logger.log('🎉 ========================================');
    Logger.log('🎉 ¡INSTALACIÓN COMPLETADA CON ÉXITO!');
    Logger.log('🎉 ========================================');

  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('📋 Stack: ' + error.stack);
    throw error;
  }
}

// ============================================
// MIGRACIÓN: columna PERMISOS en ROLES
// ============================================

/**
 * Asegura que la hoja ROLES tenga la columna 'permisos'.
 * Si no existe, la agrega al final y la rellena con los permisos
 * por defecto para los roles base.
 *
 * TAMBIÉN agrega el permiso 'caja' al rol admin si le falta
 * (por la migración del módulo Caja).
 *
 * Es idempotente: se puede ejecutar varias veces sin problema.
 */
function migrarRolesConPermisos() {
  Logger.log('🔧 Migrando ROLES con permisos...');

  var ss = Base_Model.getSpreadsheet();
  var hoja = ss.getSheetByName(CONFIG.DB.ROLES);

  if (!hoja) {
    Logger.log('❌ No existe la hoja ROLES.');
    return;
  }

  var lastCol = hoja.getLastColumn();
  var lastRow = hoja.getLastRow();

  if (lastCol === 0) {
    Logger.log('⚠️ La hoja ROLES está vacía.');
    return;
  }

  var headers = hoja.getRange(1, 1, 1, lastCol).getValues()[0];
  var colPermisos = headers.indexOf('permisos') + 1;

  // CASO A: la columna no existe → agregarla
  if (colPermisos === 0) {
    var nuevaCol = lastCol + 1;
    hoja.getRange(1, nuevaCol).setValue('permisos').setFontWeight('bold');
    Logger.log('   ✅ Columna "permisos" agregada en la posición ' + nuevaCol + '.');
    colPermisos = nuevaCol;
  } else {
    Logger.log('   ℹ️ Columna "permisos" ya existe en la posición ' + colPermisos + '.');
  }

  // Rellenar permisos por defecto en roles base si están vacíos
  var permisosDefault = {
    'admin':   'pedidos,mesas,productos,categorias,usuarios,roles,caja,archivo,facturacion,configuracion',
    'mozo':    'pedidos,mesas',
    'cocina':  'pedidos',
    'cliente': '',
    'totem':   ''
  };

  if (lastRow > 1) {
    var roles = hoja.getRange(2, 1, lastRow - 1, 1).getValues();

    for (var i = 0; i < roles.length; i++) {
      var rolId = String(roles[i][0]).trim().toLowerCase();
      var celdaPermisos = hoja.getRange(i + 2, colPermisos);
      var valorActual = String(celdaPermisos.getValue() || '').trim();

      // Rellenar si está vacío
      if (!valorActual && permisosDefault.hasOwnProperty(rolId)) {
        celdaPermisos.setValue(permisosDefault[rolId]);
        Logger.log('   ✅ Rol "' + rolId + '" → permisos: ' + permisosDefault[rolId]);
        continue;
      }

      // 👈 NUEVO: asegurar que el admin tenga 'caja' aunque ya tenga permisos
      if (rolId === 'admin' && valorActual && valorActual.indexOf('caja') === -1) {
        var nuevosPermisos = valorActual + ',caja';
        celdaPermisos.setValue(nuevosPermisos);
        Logger.log('   ✅ Permiso "caja" agregado al admin: ' + nuevosPermisos);
      }
    }
  }

  Logger.log('✅ Migración de permisos completada.');
}

/**
 * MIGRACIÓN: convierte la columna rol_id de ROLES y USERS
 * de números viejos (1..5) a strings nuevos ('admin'...'totem').
 */
function migrarRolesAString() {
  var ss = Base_Model.getSpreadsheet();

  var mapa = {
    '1': 'admin',
    '2': 'mozo',
    '3': 'cocina',
    '4': 'cliente',
    '5': 'totem'
  };

  // --- Migrar hoja ROLES ---
  var hojaRoles = ss.getSheetByName(CONFIG.DB.ROLES);
  if (hojaRoles) {
    var lastRow = hojaRoles.getLastRow();
    if (lastRow > 1) {
      var data = hojaRoles.getRange(2, 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < data.length; i++) {
        var viejo = String(data[i][0]).trim();
        if (mapa[viejo]) {
          hojaRoles.getRange(i + 2, 1).setValue(mapa[viejo]);
          Logger.log('ROLES fila ' + (i + 2) + ': ' + viejo + ' → ' + mapa[viejo]);
        }
      }
    }
  }

  // --- Migrar hoja USERS ---
  var hojaUsers = ss.getSheetByName(CONFIG.DB.USERS);
  if (hojaUsers) {
    var lastRow2 = hojaUsers.getLastRow();
    if (lastRow2 > 1) {
      var headers = hojaUsers.getRange(1, 1, 1, hojaUsers.getLastColumn()).getValues()[0];
      var colRol = headers.indexOf('rol_id') + 1;
      if (colRol > 0) {
        var data2 = hojaUsers.getRange(2, colRol, lastRow2 - 1, 1).getValues();
        for (var j = 0; j < data2.length; j++) {
          var viejo2 = String(data2[j][0]).trim();
          if (mapa[viejo2]) {
            hojaUsers.getRange(j + 2, colRol).setValue(mapa[viejo2]);
            Logger.log('USERS fila ' + (j + 2) + ': ' + viejo2 + ' → ' + mapa[viejo2]);
          }
        }
      }
    }
  }

  Logger.log('✅ Migración de roles completada.');
}

/**
 * DESINSTALAR: Elimina todas las tablas
 */
function uninstall() {
  try {
    Logger.log('🧹 Iniciando desinstalación...');

    var ss = Base_Model.getSpreadsheet();
    var tables = [
      CONFIG.DB.CAJA_MOVIMIENTOS,   // 👈 NUEVO
      CONFIG.DB.CAJA,               // 👈 NUEVO
      CONFIG.DB.PEDIDO_ITEMS,
      CONFIG.DB.PEDIDOS,
      CONFIG.DB.MESAS,
      CONFIG.DB.PRODUCTOS,
      CONFIG.DB.CATEGORIAS,
      CONFIG.DB.USERS,
      CONFIG.DB.ROLES
    ];

    for (var i = 0; i < tables.length; i++) {
      var sheet = ss.getSheetByName(tables[i]);
      if (sheet) {
        ss.deleteSheet(sheet);
        Logger.log('🗑️ Tabla ' + tables[i] + ' eliminada');
      }
    }

    Logger.log('🧹 ¡DESINSTALACIÓN COMPLETADA!');

  } catch (error) {
    Logger.log('❌ Error: ' + error.message);
  }
}

/**
 * PUNTO DE ENTRADA
 */
function myFunction() {
  install();
}
