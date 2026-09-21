/**
 * Modelo para la gestión de usuarios
 * Archivo: 14_Model_Users.gs
 */

var User_Model = {

  // 🔐 Función para generar el hash de la contraseña (SHA-256)
  // ✅ PROTEGIDA CONTRA NULL/UNDEFINED
  hashPassword: function(password) {
    // Si la contraseña es null o undefined, usar un valor por defecto
    if (!password) {
      password = 'default_password'; // Valor por defecto para evitar el error
    }
    
    return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password)
      .map(function(byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
      }).join('');
  },

  // Encontrar usuario por email usando Base_Model
  findByEmail: function(email) {
    var users = Base_Model.all(CONFIG.DB.USERS);
    for (var i = 0; i < users.length; i++) {
      if (users[i].email === email) {
        return users[i];
      }
    }
    return null;
  },

  // Obtener todos los usuarios
  getAll: function() {
    return Base_Model.all(CONFIG.DB.USERS);
  }
};
