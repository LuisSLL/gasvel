/**
 * 0_Install.gs
 * Script de instalación del sistema GASVEL Restaurante
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
    
    // ROLES
    Base_Model.createTable(CONFIG.DB.ROLES, [
      'rol_id', 'nombre', 'descripcion'
    ]);
    
    // USERS
    Base_Model.createTable(CONFIG.DB.USERS, [
      'user_id', 'nombre', 'apellido', 'email', 'telefono', 'wpp', 
      'rol_id', 'pass_hash', 'activo', 'fecha_registro'
    ]);
    
    // CATEGORIAS
    Base_Model.createTable(CONFIG.DB.CATEGORIAS, [
      'cat_id', 'nombre', 'descripcion', 'activo'
    ]);
    
    // PRODUCTOS
    Base_Model.createTable(CONFIG.DB.PRODUCTOS, [
      'product_id', 'nombre', 'descripcion', 'precio', 'cat_id', 
      'imagen_url', 'activo', 'tiempo_preparacion', 'stock_control', 'stock_actual'
    ]);
    
    // MESAS
    Base_Model.createTable(CONFIG.DB.MESAS, [
      'mesa_num', 'capacidad', 'estado', 'qr_url', 'activo'
    ]);
    
    // PEDIDOS
    Base_Model.createTable(CONFIG.DB.PEDIDOS, [
      'pedido_id', 'numero_pedido', 'fecha', 'tipo', 'mesa_num', 
      'user_id', 'cliente_nombre', 'cliente_wpp', 'estado', 'total', 
      'metodo_pago', 'observaciones', 'creado_por_user_id'
    ]);
    
    // PEDIDO_ITEMS
    Base_Model.createTable(CONFIG.DB.PEDIDO_ITEMS, [
      'item_id', 'pedido_id', 'product_id', 'nombre_producto', 
      'cantidad', 'precio_unitario', 'subtotal', 'notas'
    ]);
    
    Logger.log('✅ Tablas creadas correctamente');
    
    // ============================================
    // 2. DATOS INICIALES - ROLES
    // ============================================
    
    Logger.log('📋 Insertando roles...');
    
    var roles = Base_Model.all(CONFIG.DB.ROLES);
    if (roles.length === 0) {
      Base_Model.create(CONFIG.DB.ROLES, { 
        rol_id: 1, 
        nombre: 'ADMIN', 
        descripcion: 'Administrador del sistema' 
      });
      Base_Model.create(CONFIG.DB.ROLES, { 
        rol_id: 2, 
        nombre: 'CAJA', 
        descripcion: 'Cajero / Facturación' 
      });
      Base_Model.create(CONFIG.DB.ROLES, { 
        rol_id: 3, 
        nombre: 'COCINA', 
        descripcion: 'Cocinero / Preparación' 
      });
      Base_Model.create(CONFIG.DB.ROLES, { 
        rol_id: 4, 
        nombre: 'CLIENTE', 
        descripcion: 'Cliente registrado' 
      });
      Logger.log('✅ Roles insertados');
    } else {
      Logger.log('ℹ️ Roles ya existen');
    }
    
    // ============================================
    // 3. DATOS INICIALES - USUARIO ADMIN
    // ============================================
    
    Logger.log('📋 Creando usuario admin...');
    
    var users = Base_Model.all(CONFIG.DB.USERS);
    if (users.length === 0) {
      var hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'admin123')
        .map(function(b) {
          return ('0' + (b & 0xFF).toString(16)).slice(-2);
        })
        .join('');
      
      Base_Model.create(CONFIG.DB.USERS, {
        user_id: 1,
        nombre: 'Administrador',
        apellido: 'Sistema',
        email: 'admin@restaurante.com',
        telefono: '555-1234',
        wpp: '555-1234',
        rol_id: 1,
        pass_hash: hash,
        activo: true,
        fecha_registro: new Date()
      });
      Logger.log('✅ Usuario admin creado');
    } else {
      Logger.log('ℹ️ Usuarios ya existen');
    }
    
    // ============================================
    // 4. DATOS INICIALES - MESAS
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
    // 5. DATOS INICIALES - CATEGORÍAS
    // ============================================
    
    Logger.log('📋 Creando categorías...');
    
    var categorias = Base_Model.all(CONFIG.DB.CATEGORIAS);
    if (categorias.length === 0) {
      Base_Model.create(CONFIG.DB.CATEGORIAS, { 
        cat_id: 1, 
        nombre: 'HAMBURGUESAS', 
        descripcion: 'Nuestras mejores hamburguesas',
        activo: true 
      });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { 
        cat_id: 2, 
        nombre: 'PIZZAS', 
        descripcion: 'Pizzas artesanales al horno',
        activo: true 
      });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { 
        cat_id: 3, 
        nombre: 'BEBIDAS', 
        descripcion: 'Bebidas frías y calientes',
        activo: true 
      });
      Base_Model.create(CONFIG.DB.CATEGORIAS, { 
        cat_id: 4, 
        nombre: 'POSTRES', 
        descripcion: 'Dulces y postres caseros',
        activo: true 
      });
      Logger.log('✅ Categorías insertadas');
    } else {
      Logger.log('ℹ️ Categorías ya existen');
    }
    
    // ============================================
    // 6. DATOS INICIALES - PRODUCTOS
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
    // 7. FINALIZAR
    // ============================================
    
    Logger.log('🎉 ========================================');
    Logger.log('🎉 ¡INSTALACIÓN COMPLETADA CON ÉXITO!');
    Logger.log('🎉 ========================================');
    Logger.log('📝 Usuario: admin@restaurante.com');
    Logger.log('🔑 Contraseña: admin123');
    Logger.log('👤 Rol: ADMIN');
    Logger.log('📊 Tablas creadas: 7');
    Logger.log('📋 Roles: 4');
    Logger.log('🪑 Mesas: 10');
    Logger.log('📦 Productos: 12');
    Logger.log('📂 Categorías: 4');
    Logger.log('🎉 ========================================');
    
  } catch (error) {
    Logger.log('❌ ERROR: ' + error.message);
    Logger.log('📋 Stack: ' + error.stack);
    throw error;
  }
}

/**
 * DESINSTALAR: Elimina todas las tablas
 */
function uninstall() {
  try {
    Logger.log('🧹 Iniciando desinstalación...');
    
    var ss = Base_Model.getSpreadsheet();
    var tables = [
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
