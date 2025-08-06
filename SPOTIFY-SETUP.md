# 🎵 **CONFIGURACIÓN DE SPOTIFY API - PASO A PASO**

## 🎯 **PASOS PARA CONFIGURAR TU APLICACIÓN SPOTIFY:**

### **1️⃣ Crear Aplicación en Spotify Developer Dashboard**

1. **🌐 Ve a**: [Spotify for Developers](https://developer.spotify.com/dashboard)
2. **🔑 Inicia sesión** con tu cuenta de Spotify Premium
3. **➕ Haz clic en "Create app"**
4. **📝 Completa los datos:**
   - **App name**: `Audio Panel Controller`
   - **App description**: `Control automático de Spotify desde Audio Panel`
   - **Website**: `http://localhost:8000`
   - **Redirect URI**: `http://localhost:8000/callback`
   - **APIs used**: Marca `Web API`
5. **✅ Acepta** términos y condiciones
6. **💾 Guarda** la aplicación

### **2️⃣ Obtener Client ID**

1. **📱 Haz clic** en tu aplicación recién creada
2. **📋 Copia** el **Client ID** (se ve así: `1a2b3c4d5e6f7g8h9i0j`)
3. **⚠️ NO compartas** el Client Secret (lo mantienes privado)

### **3️⃣ Configurar tu Audio Panel**

1. **🗂️ Abre** el archivo `spotify-integration.js`
2. **🔍 Busca** la línea que dice:
   ```javascript
   this.clientId = 'TU_CLIENT_ID_AQUI';
   ```
3. **✏️ Reemplaza** `TU_CLIENT_ID_AQUI` con tu Client ID:
   ```javascript
   this.clientId = '1a2b3c4d5e6f7g8h9i0j'; // Tu Client ID real
   ```
4. **💾 Guarda** el archivo

## 🧪 **CÓMO PROBAR QUE FUNCIONA:**

### **Paso 1: Preparar Entorno**
1. **🌐 Abre** [Spotify Web Player](https://open.spotify.com)
2. **🎵 Reproduce** cualquier canción
3. **🌐 Abre** tu Audio Panel en `http://localhost:8000`

### **Paso 2: Conectar Spotify**
1. **👀 Ve** a la sección "Administración"
2. **🔍 Busca** el botón "🔗 Conectar Spotify"
3. **🖱️ Haz clic** en el botón
4. **🔑 Autoriza** tu aplicación (solo una vez)
5. **✅ Verifica** que diga "Spotify: Conectado"

### **Paso 3: Probar Control Automático**
1. **🎵 Deja** Spotify reproduciéndose
2. **▶️ Reproduce** cualquier audio en tu Audio Panel
3. **👀 Observa**: ¡Spotify se pausa automáticamente!
4. **⏸️ Pausa** tu audio del panel
5. **👀 Observa**: ¡Spotify se reanuda automáticamente!

## 🎮 **CONTROLES DISPONIBLES:**

Una vez conectado, tendrás acceso a:

- **⏸️ Pausar**: Pausa Spotify manualmente
- **▶️ Reanudar**: Reanuda Spotify manualmente  
- **🔉 Bajar Vol.**: Reduce volumen de Spotify
- **🔊 Subir Vol.**: Aumenta volumen de Spotify
- **🎵 Info**: Muestra la canción actual

## 🔧 **SOLUCIÓN DE PROBLEMAS:**

### **❌ "Spotify: Desconectado"**
- ✅ Verifica que tengas Spotify Premium
- ✅ Asegúrate de usar Spotify en el navegador
- ✅ Verifica que el Client ID sea correcto

### **❌ "Error de autenticación"**
- ✅ Verifica la Redirect URI: `http://localhost:8000/callback`
- ✅ Asegúrate de estar en `localhost:8000` (no otro puerto)

### **❌ "No se pausa automáticamente"**
- ✅ Verifica que aparezca "Spotify: Conectado"
- ✅ Revisa la consola del navegador (F12) para errores
- ✅ Asegúrate de que Spotify esté reproduciéndose

### **❌ "404 Not Found en callback"**
- ✅ Es normal, la página se redirige automáticamente
- ✅ Si persiste, verifica la Redirect URI en Spotify Dashboard

## 🎉 **¡LISTO!**

Una vez configurado correctamente:

1. **🎵 Spotify se pausará automáticamente** cuando reproduzcas anuncios
2. **▶️ Spotify se reanudará automáticamente** cuando terminen
3. **🎮 Tendrás control manual** con los botones
4. **📱 Todo funcionará** de forma transparente

## 💡 **CONSEJOS:**

- **🔄 Mantén** Spotify Web Player abierto en una pestaña
- **🎵 La primera conexión** requiere autorización (solo una vez)
- **📱 Los controles manuales** están disponibles en "Administración"
- **🔊 Puedes ajustar** el volumen de Spotify sin afectar tu Audio Panel

---

**¿Necesitas ayuda?** Comparte el mensaje de error específico que ves en la consola. 🛠️