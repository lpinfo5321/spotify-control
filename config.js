// config.js - Configuración dinámica para local y Firebase
// Este archivo detecta automáticamente si estás en local o en producción

const config = {
    // Detectar si estamos en local o en Firebase
    isLocal: window.location.hostname === 'localhost' || 
             window.location.hostname === '127.0.0.1',
    
    // Obtener la URL base correcta automáticamente
    getRedirectUri: function() {
        if (this.isLocal) {
            // Para desarrollo local
            return 'http://127.0.0.1:8000/callback.html';
        } else {
            // En producción (Firebase) - usa la URL actual
            return `${window.location.origin}/callback.html`;
        }
    },
    
    // Client ID de Spotify (el mismo para ambos entornos)
    spotifyClientId: 'd5751bd3a5514fbca514576a525cde2c',
    
    // Obtener la URL base
    getBaseUrl: function() {
        return window.location.origin;
    },
    
    // Verificar si estamos en Firebase
    isFirebase: function() {
        return window.location.hostname.includes('web.app') || 
               window.location.hostname.includes('firebaseapp.com');
    }
};

// Hacer config global para que todos los scripts puedan acceder
window.appConfig = config;

// Log para debugging
console.log('🌐 Configuración cargada:', {
    isLocal: config.isLocal,
    redirectUri: config.getRedirectUri(),
    baseUrl: config.getBaseUrl()
});
