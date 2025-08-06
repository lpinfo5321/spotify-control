// Integración con Spotify Web API
class SpotifyIntegration {
    constructor() {
        // Configuración de la aplicación Spotify (se completará después)
        // Usa configuración dinámica si está disponible, si no usa valores por defecto
        this.clientId = window.appConfig ? window.appConfig.spotifyClientId : 'd5751bd3a5514fbca514576a525cde2c';
        this.redirectUri = window.appConfig ? window.appConfig.getRedirectUri() : 'http://127.0.0.1:8000/callback.html';
        this.scopes = [
            'user-read-playback-state',
            'user-modify-playback-state',
            'user-read-currently-playing',
            'streaming'
        ];
        
        // Estado de la conexión
        this.isConnected = false;
        this.accessToken = null;
        this.player = null;
        this.deviceId = null;
        this.processingAuth = false;
        this.authCheckInterval = null;
        
        // Referencias a elementos del DOM
        this.statusIndicator = null;
        this.connectButton = null;
        this.controlsContainer = null;
        
        this.init();
    }

    async init() {
        try {
            console.log('🎵 Inicializando integración con Spotify...');
            console.log('🎵 Client ID configurado:', this.clientId);
            console.log('🌐 Redirect URI:', this.redirectUri);
            console.log('📍 Entorno:', window.appConfig?.isLocal ? 'LOCAL' : 'PRODUCCIÓN');
            
            // TEST: Verificar que localStorage funciona
            try {
                localStorage.setItem('spotify_test', 'test');
                const test = localStorage.getItem('spotify_test');
                localStorage.removeItem('spotify_test');
                console.log('✅ localStorage funciona correctamente');
            } catch (e) {
                console.error('❌ Error con localStorage:', e);
            }
            
            // CRÍTICO: Definir el callback ANTES de cargar el SDK
            this.setupSpotifyCallback();
            
            // Configurar listener para mensajes de popup
            this.setupPopupListener();
            
            this.setupUI();
            this.loadStoredToken();
            await this.loadSpotifySDK();
            
            // Verificar si hay un token en la URL (callback)
            this.handleCallback();
            
            console.log('✅ Integración de Spotify inicializada');
        } catch (error) {
            console.error('❌ Error inicializando Spotify:', error);
        }
    }

    // Configurar listener para mensajes del popup de autenticación
    setupPopupListener() {
        window.addEventListener('message', (event) => {
            console.log('📨 Mensaje recibido en parent window:', {
                origin: event.origin,
                type: event.data?.type,
                hasCode: !!event.data?.code
            });
            
            // Lista de orígenes confiables para desarrollo
            const trustedOrigins = [
                window.location.origin,
                'http://127.0.0.1:8000',
                'http://localhost:8000',
                'https://sdk.scdn.co',
                'https://accounts.spotify.com'
            ];
            
            // Verificar origen por seguridad (más permisivo para callback)
            if (!trustedOrigins.includes(event.origin)) {
                console.log('⚠️ Mensaje de origen no confiable:', event.origin, 'orígenes permitidos:', trustedOrigins);
                return;
            }
            
            console.log('✅ Origen confiable:', event.origin);
            
            if (event.data && event.data.type === 'spotify-auth-success') {
                console.log('✅ ==========================================');
                console.log('✅ MENSAJE DE AUTENTICACIÓN EXITOSA RECIBIDO');
                console.log('✅ ==========================================');
                
                const code = event.data.code;
                
                if (code) {
                    console.log('🔑 Código recibido del popup, longitud:', code.length);
                    console.log('🔑 Primeros 30 caracteres:', code.substring(0, 30) + '...');
                    this.handleAuthorizationCode(code);
                } else {
                    console.error('❌ Código vacío recibido del popup');
                }
            } else {
                console.log('🔍 Mensaje ignorado, tipo:', event.data?.type);
            }
        });
        
        console.log('👂 Listener de popup configurado para orígenes:', [
            window.location.origin,
            'http://127.0.0.1:8000',
            'http://localhost:8000'
        ]);
        
        // POLLING SUPER SIMPLE Y DIRECTO
        console.log('🔄 Iniciando búsqueda de código de autorización...');
        
        let attempts = 0;
        const maxAttempts = 150; // 30 segundos (150 * 200ms)
        
        this.authCheckInterval = setInterval(() => {
            attempts++;
            
            // Buscar código en localStorage
            const authCode = localStorage.getItem('spotify_auth_code');
            const authStatus = localStorage.getItem('spotify_auth_status');
            
            // Mostrar progreso cada 3 segundos (15 intentos) para menos spam
            if (attempts % 15 === 0) {
                console.log(`⏳ Esperando código... (${attempts/5}s)`);
            }
            
            if (authCode && authCode.length > 0) {
                console.log('🎉 ==========================================');
                console.log('🎉 ¡¡¡CÓDIGO ENCONTRADO!!!');
                console.log('🎉 ==========================================');
                console.log('📝 Código:', authCode.substring(0, 40) + '...');
                
                // Detener polling inmediatamente
                clearInterval(this.authCheckInterval);
                this.authCheckInterval = null;
                
                // Prevenir procesamiento duplicado
                if (this.processingAuth) {
                    console.log('⚠️ Ya se está procesando, evitando duplicado');
                    return;
                }
                
                this.processingAuth = true;
                
                // Limpiar código para evitar re-procesamiento
                localStorage.removeItem('spotify_auth_code');
                localStorage.removeItem('spotify_auth_status');
                
                // PROCESAR CÓDIGO
                console.log('🚀 Procesando código de autorización...');
                this.handleAuthorizationCode(authCode);
                
            } else if (authStatus === 'success') {
                // El callback marcó éxito pero no hay código (raro)
                console.log('⚠️ Estado exitoso pero sin código');
                clearInterval(this.authCheckInterval);
                this.authCheckInterval = null;
                
            } else if (attempts >= maxAttempts) {
                // Timeout después de 30 segundos
                console.log('⏰ Timeout esperando código (30s)');
                clearInterval(this.authCheckInterval);
                this.authCheckInterval = null;
            }
            
        }, 200); // Verificar cada 200ms
    }

    // Configurar callback del SDK ANTES de cargarlo
    setupSpotifyCallback() {
        const self = this;
        window.onSpotifyWebPlaybackSDKReady = () => {
            console.log('🎵 SDK de Spotify listo, inicializando reproductor...');
            
            if (!self.accessToken) {
                console.log('⚠️ No hay token de acceso, saltando inicialización del reproductor');
                return;
            }
            
            const player = new Spotify.Player({
                name: 'Audio Panel Controller',
                getOAuthToken: cb => { cb(self.accessToken); },
                volume: 0.8
            });

            // Eventos del reproductor
            player.addListener('ready', ({ device_id }) => {
                console.log('✅ Reproductor Spotify listo con Device ID:', device_id);
                self.deviceId = device_id;
                self.player = player;
                self.updateConnectionStatus(true);
            });

            player.addListener('not_ready', ({ device_id }) => {
                console.log('❌ Reproductor Spotify no está listo:', device_id);
                self.updateConnectionStatus(false);
            });

            player.addListener('player_state_changed', (state) => {
                if (state) {
                    self.updateCurrentTrack(state.track_window.current_track);
                }
            });

            // Conectar el reproductor
            player.connect().then(success => {
                if (success) {
                    console.log('✅ Reproductor conectado exitosamente');
                } else {
                    console.log('❌ Error conectando reproductor');
                }
            });
        };
        
        console.log('✅ Callback de Spotify configurado globalmente');
    }

    // Configurar interfaz de usuario
    setupUI() {
        console.log('🔧 Configurando UI de Spotify...');
        
        // Buscar la sección de administración - ESTRATEGIA MÁS DIRECTA
        let adminSection = null;
        
        // Intentar múltiples selectores basados en la estructura real del HTML
        const selectors = [
            '#adminView',           // ID principal de la vista de administración
            '.admin-panel',         // Panel de administración
            '.view-section',        // Sección de vista
            '.admin-content',       // Contenido de administración (genérico)
            '.view-content',        // Contenido de vista (genérico)
            '.content-section'      // Sección de contenido (genérico)
        ];
        
        for (const selector of selectors) {
            adminSection = document.querySelector(selector);
            if (adminSection) {
                console.log(`✅ Sección encontrada con: ${selector}`);
                break;
            }
        }
        
        // Si no se encuentra ninguna, usar el body directamente
        if (!adminSection) {
            console.log('⚠️ No se encontró sección específica, usando contenedor principal...');
            // Buscar el contenedor principal de la aplicación
            adminSection = document.querySelector('.app-container') || 
                          document.querySelector('.main') || 
                          document.querySelector('main') || 
                          document.body;
            console.log('📍 Usando contenedor:', adminSection.className || adminSection.tagName);
        }

        // Crear contenedor principal de Spotify con estilos inline como fallback
        const spotifySection = document.createElement('div');
        spotifySection.id = 'spotify-integration-section';
        spotifySection.style.cssText = `
            margin: 20px 0;
            padding: 20px;
            border: 2px solid #1ed760;
            border-radius: 12px;
            background: linear-gradient(135deg, rgba(30, 215, 96, 0.05), rgba(29, 185, 84, 0.05));
        `;
        
        spotifySection.innerHTML = `
            <div class="spotify-status disconnected" id="spotify-status" style="
                margin: 10px 0;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #ff6b6b;
                background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.05));
                color: #ff6b6b;
                font-weight: 600;
            ">
                <div class="status-content" style="display: flex; align-items: center; gap: 8px;">
                    <span class="status-icon" style="font-size: 1.2rem;">🎵</span>
                    <span class="status-text">Spotify: Desconectado</span>
                </div>
            </div>
            
            <button id="spotify-connect-btn" class="spotify-connect-btn" style="
                background: linear-gradient(135deg, #1ed760, #1db954);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                margin: 10px 0;
                font-size: 1rem;
                transition: all 0.3s ease;
            ">
                🔗 Conectar Spotify
            </button>
            
            <div id="spotify-controls" class="spotify-controls hidden" style="
                margin: 15px 0;
                padding: 15px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(30, 215, 96, 0.2);
                border-radius: 8px;
                display: none;
            ">
                <div class="spotify-control-group">
                    <h4 style="margin: 0 0 15px 0; color: #1ed760; display: flex; align-items: center; gap: 8px;">
                        🎵 Control de Spotify
                    </h4>
                    <div class="spotify-buttons" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                        <button id="spotify-pause" class="spotify-control-btn" style="
                            background: linear-gradient(135deg, #1ed760, #1db954);
                            color: white;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">⏸️ Pausar</button>
                        <button id="spotify-resume" class="spotify-control-btn" style="
                            background: linear-gradient(135deg, #1ed760, #1db954);
                            color: white;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">▶️ Reanudar</button>
                        <button id="spotify-volume-down" class="spotify-control-btn" style="
                            background: linear-gradient(135deg, #1ed760, #1db954);
                            color: white;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">🔉 Bajar Vol.</button>
                        <button id="spotify-volume-up" class="spotify-control-btn" style="
                            background: linear-gradient(135deg, #1ed760, #1db954);
                            color: white;
                            border: none;
                            padding: 8px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 0.9rem;
                        ">🔊 Subir Vol.</button>
                    </div>
                    <div class="current-track" style="
                        padding: 10px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 6px;
                        border: 1px solid rgba(30, 215, 96, 0.2);
                    ">
                        <span id="current-track-info" style="color: #1ed760; font-size: 0.9rem;">
                            No hay pista reproduciéndose
                        </span>
                    </div>
                </div>
            </div>
        `;

        // Agregar la sección completa
        adminSection.appendChild(spotifySection);
        
        // Obtener referencias
        this.statusIndicator = document.getElementById('spotify-status');
        this.connectButton = document.getElementById('spotify-connect-btn');
        this.controlsContainer = document.getElementById('spotify-controls');

        // Agregar eventos con verificación de existencia
        const connectButton = document.getElementById('spotify-connect-btn');
        if (connectButton) {
            connectButton.onclick = async () => {
                try {
                    await this.authenticate();
                } catch (error) {
                    console.error('❌ Error en botón de conexión:', error);
                }
            };
            console.log('✅ Evento de conexión agregado');
        }
        
        // Eventos de los controles con verificación
        const pauseBtn = document.getElementById('spotify-pause');
        const resumeBtn = document.getElementById('spotify-resume');
        const volumeDownBtn = document.getElementById('spotify-volume-down');
        const volumeUpBtn = document.getElementById('spotify-volume-up');
        
        if (pauseBtn) pauseBtn.addEventListener('click', () => this.pause());
        if (resumeBtn) resumeBtn.addEventListener('click', () => this.resume());
        if (volumeDownBtn) volumeDownBtn.addEventListener('click', () => this.setVolume(-10));
        if (volumeUpBtn) volumeUpBtn.addEventListener('click', () => this.setVolume(10));
        
        console.log('✅ Eventos de controles agregados');
        
        console.log('✅ UI de Spotify configurada exitosamente');
    }

    // Cargar el SDK de Spotify
    async loadSpotifySDK() {
        return new Promise((resolve, reject) => {
            // Verificar si ya está cargado
            if (window.Spotify && window.Spotify.Player) {
                console.log('✅ Spotify SDK ya estaba cargado');
                resolve();
                return;
            }

            console.log('📥 Cargando Spotify SDK...');

            // Cargar el SDK
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            
            script.onload = () => {
                console.log('✅ Script del Spotify SDK cargado');
                // El SDK se inicializa automáticamente y llama a onSpotifyWebPlaybackSDKReady
                resolve();
            };
            
            script.onerror = () => {
                console.error('❌ Error cargando Spotify SDK');
                reject(new Error('No se pudo cargar el SDK de Spotify'));
            };

            document.head.appendChild(script);
        });
    }

    // Autenticación con Spotify
    async authenticate() {
        console.log('🔑 Iniciando autenticación con Spotify...');
        
        // LIMPIAR cualquier código viejo antes de empezar
        console.log('🧹 Limpiando datos viejos de autenticación...');
        localStorage.removeItem('spotify_auth_code');
        localStorage.removeItem('spotify_code_verifier');
        localStorage.removeItem('spotify_state');
        
        try {
            // Usar el flujo de código de autorización (PKCE)
            const state = this.generateRandomString(16);
            const codeVerifier = this.generateRandomString(128);
            
            // Guardar para verificación posterior
            localStorage.setItem('spotify_code_verifier', codeVerifier);
            localStorage.setItem('spotify_state', state);
            
            // Generar code challenge (await porque es asíncrono)
            const codeChallenge = await this.generateCodeChallenge(codeVerifier);
            
            const authUrl = `https://accounts.spotify.com/authorize?` +
                `client_id=${this.clientId}&` +
                `response_type=code&` +
                `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
                `scope=${encodeURIComponent(this.scopes.join(' '))}&` +
                `code_challenge_method=S256&` +
                `code_challenge=${codeChallenge}&` +
                `state=${state}&` +
                `show_dialog=true`;

            console.log('🌐 URL de autenticación (PKCE):', authUrl);

            // Abrir en popup
            const popup = window.open(
                authUrl,
                'spotify-auth',
                'width=600,height=700,scrollbars=yes,resizable=yes'
            );

            // Monitorear el popup Y verificar localStorage periódicamente
            let popupCheckInterval;
            let codeCheckInterval;
            
            // Función para limpiar todos los intervalos
            const cleanupIntervals = () => {
                if (popupCheckInterval) clearInterval(popupCheckInterval);
                if (codeCheckInterval) clearInterval(codeCheckInterval);
            };
            
            // Verificar periódicamente si hay código en localStorage (fallback robusto)
            codeCheckInterval = setInterval(() => {
                const storedCode = localStorage.getItem('spotify_auth_code');
                if (storedCode) {
                    console.log('✅ ¡Código encontrado via polling de localStorage!');
                    cleanupIntervals();
                    this.handleAuthorizationCode(storedCode);
                }
            }, 500); // Verificar cada 500ms
            
            // Monitorear el popup
            popupCheckInterval = setInterval(() => {
                if (popup.closed) {
                    console.log('🔄 ==========================================');
                    console.log('🔄 POPUP CERRADO - VERIFICANDO ESTADO');
                    console.log('🔄 ==========================================');
                    
                    // Dar un poco más de tiempo para que el localStorage se actualice
                    setTimeout(() => {
                        const storedCode = localStorage.getItem('spotify_auth_code');
                        console.log('🔍 Código almacenado después del popup:', !!storedCode);
                        
                        if (storedCode) {
                            console.log('✅ Código encontrado después del cierre del popup');
                            this.handleAuthorizationCode(storedCode);
                        } else {
                            console.log('⚠️ No se encontró código - posibles causas:');
                            console.log('   - Usuario canceló la autorización');
                            console.log('   - Error en el callback');
                            console.log('   - Problema de comunicación popup->parent');
                            
                            this.showToast('⚠️ No se completó la autorización', 'error');
                        }
                        
                        cleanupIntervals();
                    }, 1000); // Esperar 1 segundo adicional
                }
            }, 1000);

            // Timeout para cerrar el popup automáticamente
            setTimeout(() => {
                if (!popup.closed) {
                    popup.close();
                    console.log('⏰ Popup cerrado por timeout');
                }
                cleanupIntervals();
            }, 60000); // 1 minuto
            
        } catch (error) {
            console.error('❌ Error en autenticación:', error);
        }
    }

    // Manejar el código de autorización recibido
    async handleAuthorizationCode(code) {
        try {
            console.log('🔑 ==========================================');
            console.log('🔑 PROCESANDO CÓDIGO DE AUTORIZACIÓN');
            console.log('🔑 ==========================================');
            console.log('📝 Código recibido:', code ? code.substring(0, 20) + '...' : 'NULO');
            
            const codeVerifier = localStorage.getItem('spotify_code_verifier');
            console.log('🔍 Code verifier encontrado:', !!codeVerifier);
            
            if (!codeVerifier) {
                console.error('❌ Code verifier no encontrado en localStorage');
                this.showToast('❌ Error: Datos de autenticación perdidos', 'error');
                throw new Error('Code verifier no encontrado');
            }
            
            console.log('🔄 Iniciando intercambio de código por token...');
            
            // Intercambiar código por token
            const accessToken = await this.exchangeCodeForToken(code, codeVerifier);
            
            if (!accessToken) {
                throw new Error('No se recibió access token');
            }
            
            console.log('🧹 Limpiando datos temporales...');
            // Limpiar datos temporales
            localStorage.removeItem('spotify_code_verifier');
            localStorage.removeItem('spotify_state');
            localStorage.removeItem('spotify_auth_code');
            
            console.log('🔑 Configurando token de acceso...');
            // Configurar token
            this.setAccessToken(accessToken);
            
            console.log('✅ ¡AUTENTICACIÓN COMPLETADA EXITOSAMENTE!');
            console.log('🎉 SPOTIFY CONECTADO - Usuario debería ver "Conectado" ahora');
            
            // Limpiar polling de localStorage ya que fue exitoso
            if (this.authCheckInterval) {
                clearInterval(this.authCheckInterval);
                this.authCheckInterval = null;
                console.log('🧹 Polling de localStorage limpiado');
            }
            
            // Marcar que ya no estamos procesando
            this.processingAuth = false;
            
            // Mostrar toast de éxito
            this.showToast('🎵 ¡Spotify conectado exitosamente!', 'success');
            
        } catch (error) {
            console.error('❌ ==========================================');
            console.error('❌ ERROR EN AUTENTICACIÓN');
            console.error('❌ ==========================================');
            console.error('❌ Error:', error);
            console.error('❌ Stack:', error.stack);
            
            // Limpiar estado en caso de error
            this.processingAuth = false;
            if (this.authCheckInterval) {
                clearInterval(this.authCheckInterval);
                this.authCheckInterval = null;
            }
            
            this.showToast('❌ Error conectando con Spotify', 'error');
        }
    }

    // Generar string aleatorio para PKCE
    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const values = crypto.getRandomValues(new Uint8Array(length));
        return values.reduce((acc, x) => acc + possible[x % possible.length], '');
    }

    // Generar code challenge para PKCE
    async generateCodeChallenge(codeVerifier) {
        function base64encode(string) {
            return btoa(String.fromCharCode.apply(null, string))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return base64encode(new Uint8Array(digest));
    }

    // Intercambiar código por token
    async exchangeCodeForToken(code, codeVerifier) {
        console.log('🔄 ==========================================');
        console.log('🔄 INTERCAMBIANDO CÓDIGO POR TOKEN');
        console.log('🔄 ==========================================');
        console.log('📝 Client ID:', this.clientId);
        console.log('📝 Código (primeros 30):', code.substring(0, 30) + '...');
        console.log('📝 Redirect URI:', this.redirectUri);
        console.log('📝 Code Verifier existe:', !!codeVerifier);
        console.log('📝 Longitud Code Verifier:', codeVerifier ? codeVerifier.length : 0);
        
        const body = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.redirectUri,
            code_verifier: codeVerifier
        });

        try {
            console.log('🌐 Enviando request a Spotify API...');
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: body.toString()
            });

            console.log('📡 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Error response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ Token recibido exitosamente, longitud:', data.access_token?.length);
            
            return data.access_token;
        } catch (error) {
            console.error('❌ Error intercambiando código:', error);
            
            // Si falla el intercambio de token, mostrar mensaje al usuario
            this.showToast('❌ Error conectando con Spotify. Revisa que tengas Premium.', 'error');
            throw error;
        }
    }

    // Manejar callback de autenticación
    handleCallback() {
        // Verificar si hay código de autorización en los query params (flujo PKCE)
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        
        if (error) {
            console.error('❌ Error en callback:', error);
            return;
        }
        
        if (code) {
            console.log('✅ Código de autorización recibido en callback');
            this.handleAuthorizationCode(code);
            
            // Limpiar URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }
        
        // Fallback: verificar el hash (flujo legacy)
        const hash = window.location.hash.substring(1);
        if (hash) {
            const params = new URLSearchParams(hash);
            const token = params.get('access_token');
            
            if (token) {
                console.log('✅ Token de acceso recibido (legacy)');
                this.setAccessToken(token);
                
                // Limpiar URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }
    }

    // Establecer token de acceso
    setAccessToken(token) {
        console.log('🔑 Configurando token de acceso y actualizando UI...');
        this.accessToken = token;
        localStorage.setItem('spotify_access_token', token);
        
        // IMPORTANTE: Actualizar UI inmediatamente para mostrar conexión exitosa
        this.updateConnectionStatus(true);
        console.log('✅ UI actualizada - Estado debería mostrar "Conectado"');
        
        this.initializePlayer();
    }

    // Cargar token almacenado
    loadStoredToken() {
        const storedToken = localStorage.getItem('spotify_access_token');
        if (storedToken) {
            console.log('🔄 Cargando token almacenado...');
            this.accessToken = storedToken;
            this.initializePlayer();
        }
    }

    // Inicializar reproductor de Spotify
    async initializePlayer() {
        if (!this.accessToken) {
            console.log('⚠️ Token no disponible para inicializar reproductor');
            return;
        }

        try {
            console.log('🔄 Intentando inicializar reproductor con token existente...');
            
            // Si el SDK ya está listo, ejecutar callback inmediatamente
            if (window.Spotify && window.Spotify.Player && window.onSpotifyWebPlaybackSDKReady) {
                console.log('🎵 SDK ya estaba cargado, ejecutando callback...');
                window.onSpotifyWebPlaybackSDKReady();
            } else {
                console.log('⏳ Esperando a que el SDK de Spotify se cargue...');
            }

        } catch (error) {
            console.error('Error inicializando reproductor:', error);
            this.updateConnectionStatus(false);
        }
    }

    // Actualizar estado de conexión
    updateConnectionStatus(connected) {
        this.isConnected = connected;
        console.log(`🔄 Actualizando estado de conexión: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
        
        // Actualizar indicador de estado
        const statusIndicator = document.getElementById('spotify-status');
        if (statusIndicator) {
            statusIndicator.className = `spotify-status ${connected ? 'connected' : 'disconnected'}`;
            
            // Actualizar estilos dinámicamente
            if (connected) {
                statusIndicator.style.borderColor = '#1ed760';
                statusIndicator.style.background = 'linear-gradient(135deg, rgba(30, 215, 96, 0.1), rgba(30, 215, 96, 0.05))';
                statusIndicator.style.color = '#1ed760';
            } else {
                statusIndicator.style.borderColor = '#ff6b6b';
                statusIndicator.style.background = 'linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.05))';
                statusIndicator.style.color = '#ff6b6b';
            }
            
            const statusText = statusIndicator.querySelector('.status-text');
            if (statusText) {
                statusText.textContent = `Spotify: ${connected ? 'Conectado' : 'Desconectado'}`;
            }
        }

        // Mostrar/ocultar botón de conexión
        const connectButton = document.getElementById('spotify-connect-btn');
        if (connectButton) {
            connectButton.style.display = connected ? 'none' : 'block';
        }

        // Mostrar/ocultar controles
        const controlsContainer = document.getElementById('spotify-controls');
        if (controlsContainer) {
            controlsContainer.style.display = connected ? 'block' : 'none';
        }
        
        console.log(`✅ Estado actualizado correctamente`);
    }

    // Actualizar información de pista actual
    updateCurrentTrack(track) {
        const trackInfo = document.getElementById('current-track-info');
        if (trackInfo && track) {
            trackInfo.textContent = `${track.name} - ${track.artists.map(a => a.name).join(', ')}`;
        }
    }

    // === MÉTODOS DE CONTROL ===

    // Pausar Spotify
    async pause() {
        if (!this.isConnected) {
            console.log('⚠️ Spotify no está conectado');
            return false;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok || response.status === 204) {
                console.log('⏸️ Spotify pausado exitosamente');
                return true;
            } else if (response.status === 403) {
                // 403 = No hay música activa o no tienes Premium
                console.log('ℹ️ No hay música activa en Spotify o requiere Premium');
                return false; // No es un error crítico
            } else if (response.status === 404) {
                // 404 = No hay dispositivo activo
                console.log('ℹ️ No hay dispositivo Spotify activo');
                return false;
            } else {
                throw new Error(`Error ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️ No se pudo pausar Spotify:', error.message);
            return false;
        }
    }

    // Reanudar Spotify
    async resume() {
        if (!this.isConnected) {
            console.log('⚠️ Spotify no está conectado');
            return false;
        }

        try {
            const response = await fetch('https://api.spotify.com/v1/me/player/play', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok || response.status === 204) {
                console.log('▶️ Spotify reanudado exitosamente');
                return true;
            } else if (response.status === 403) {
                // 403 = Requiere Premium o no hay contenido
                console.log('ℹ️ Spotify Premium requerido o no hay música para reanudar');
                return false;
            } else if (response.status === 404) {
                // 404 = No hay dispositivo activo
                console.log('ℹ️ No hay dispositivo Spotify activo');
                return false;
            } else {
                throw new Error(`Error ${response.status}`);
            }
        } catch (error) {
            console.log('⚠️ No se pudo reanudar Spotify:', error.message);
            return false;
        }
    }

    // Ajustar volumen
    async setVolume(change) {
        if (!this.isConnected) {
            console.log('⚠️ Spotify no está conectado');
            return false;
        }

        try {
            // Obtener volumen actual
            const currentState = await this.getCurrentPlayback();
            if (!currentState) return false;

            const currentVolume = currentState.device.volume_percent;
            const newVolume = Math.max(0, Math.min(100, currentVolume + change));

            const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${newVolume}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok || response.status === 204) {
                console.log(`🔊 Volumen de Spotify ajustado a ${newVolume}%`);
                this.showToast(`🔊 Volumen: ${newVolume}%`, 'success');
                return true;
            } else {
                throw new Error(`Error ${response.status}`);
            }
        } catch (error) {
            console.error('Error ajustando volumen:', error);
            this.showToast('❌ Error ajustando volumen', 'error');
            return false;
        }
    }

    // Obtener estado actual de reproducción
    async getCurrentPlayback() {
        try {
            const response = await fetch('https://api.spotify.com/v1/me/player', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (response.ok) {
                return await response.json();
            } else if (response.status === 204) {
                return null; // No hay reproducción activa
            } else {
                throw new Error(`Error ${response.status}`);
            }
        } catch (error) {
            console.error('Error obteniendo estado de reproducción:', error);
            return null;
        }
    }

    // === INTEGRACIÓN CON AUDIO PANEL ===

    // Método para ser llamado cuando se reproduce un audio en Audio Panel
    async onAudioPanelPlay() {
        console.log('🎵 Audio Panel comenzó a reproducir - pausando Spotify...');
        return await this.pause();
    }

    // Método para ser llamado cuando termina un audio en Audio Panel
    async onAudioPanelStop() {
        console.log('🎵 Audio Panel terminó - reanudando Spotify...');
        return await this.resume();
    }

    // Mostrar toast (usar el sistema existente de Audio Panel)
    showToast(message, type = 'info') {
        // Intentar usar el toast del Audio Panel si existe
        if (window.app && typeof window.app.showToast === 'function') {
            window.app.showToast(message, type);
        } else {
            // Fallback: console log
            console.log(`Toast: ${message}`);
        }
    }
}

// Inicializar cuando la página esté lista
function initializeSpotifyIntegration() {
    console.log('🚀 Iniciando integración de Spotify...');
    
    // Prevenir errores de política de permisos
    try {
        // Configurar permisos para evitar violaciones
        if (typeof document !== 'undefined') {
            // Remover cualquier listener problemático
            document.removeEventListener('beforeunload', null);
            document.removeEventListener('unload', null);
        }
    } catch (error) {
        console.log('⚠️ Error configurando permisos:', error.message);
    }
    
    // Verificar si ya existe una instancia
    if (window.spotifyIntegration) {
        console.log('⚠️ Integración de Spotify ya existe, saltando...');
        return;
    }
    
    // Crear nueva instancia
    window.spotifyIntegration = new SpotifyIntegration();
    
    // HERRAMIENTA DE EMERGENCIA - FORZAR PROCESAMIENTO
    window.forceSpotifyConnect = () => {
        console.log('🚨 ==========================================');
        console.log('🚨 MODO EMERGENCIA ACTIVADO');
        console.log('🚨 ==========================================');
        
        // Buscar código en localStorage
        let authCode = localStorage.getItem('spotify_auth_code');
        
        if (!authCode) {
            // Intentar obtener el último código del servidor (del log)
            console.log('❌ No hay código en localStorage');
            console.log('📝 Copia el código del servidor (línea 27) y ejecuta:');
            console.log('   forceSpotifyConnect("TU_CODIGO_AQUI")');
            return;
        }
        
        // Verificar code verifier
        let codeVerifier = localStorage.getItem('spotify_code_verifier');
        if (!codeVerifier) {
            console.log('⚠️ Generando code verifier de emergencia...');
            codeVerifier = window.spotifyIntegration.generateRandomString(128);
            localStorage.setItem('spotify_code_verifier', codeVerifier);
        }
        
        console.log('🚀 Forzando procesamiento del código...');
        console.log('📝 Código:', authCode.substring(0, 30) + '...');
        console.log('📝 Verifier:', codeVerifier ? 'OK' : 'ERROR');
        
        // Limpiar cualquier proceso anterior
        if (window.spotifyIntegration.authCheckInterval) {
            clearInterval(window.spotifyIntegration.authCheckInterval);
            window.spotifyIntegration.authCheckInterval = null;
        }
        
        // Forzar procesamiento
        window.spotifyIntegration.processingAuth = false; // Reset flag
        window.spotifyIntegration.handleAuthorizationCode(authCode);
    };
    
    // Versión con código manual
    window.forceSpotifyConnectWithCode = (code) => {
        console.log('🚨 Procesando código manual...');
        localStorage.setItem('spotify_auth_code', code);
        window.forceSpotifyConnect();
    };
    
    console.log('🛠️ ==========================================');
    console.log('🛠️ COMANDOS DE EMERGENCIA DISPONIBLES:');
    console.log('🛠️ forceSpotifyConnect() - Procesar código guardado');
    console.log('🛠️ forceSpotifyConnectWithCode("codigo") - Con código manual');
    console.log('🛠️ ==========================================');
}

// Múltiples puntos de entrada para asegurar inicialización
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSpotifyIntegration);
} else {
    // DOM ya está listo
    setTimeout(initializeSpotifyIntegration, 100);
}

// También escuchar cuando se cambia a la vista de administración
document.addEventListener('click', (event) => {
    const adminNavItem = event.target.closest('[data-view="admin"]');
    if (adminNavItem) {
        console.log('📱 Navegando a administración, verificando UI de Spotify...');
        setTimeout(() => {
            if (window.spotifyIntegration && !document.getElementById('spotify-integration-section')) {
                console.log('🔄 UI de Spotify no encontrada, regenerando...');
                window.spotifyIntegration.setupUI();
            }
        }, 500);
    }
});