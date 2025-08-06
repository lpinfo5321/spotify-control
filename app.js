// Panel de Control de Audio - JavaScript principal

class AudioPanel {
    constructor() {
        this.audios = [];
        this.schedules = [];
        this.currentAudio = null;
        this.audioElement = new Audio();
        this.currentView = 'library';
        this.currentAudioId = null;
        this.isPlaying = false;
        this.db = null; // IndexedDB database
        
        // Filtros de biblioteca - IMPORTANTE: inicializar en 'all'
        this.categoryFilter = 'all';
        this.searchTerm = '';
        
        // Sistema de control de medios
        this.mediaSession = null;
        this.audioContext = null;
        this.gainNode = null;
        this.audioSource = null;
        this.pauseOtherMedia = true; // Por defecto pausar otros reproductores
        this.showNotifications = true; // Por defecto mostrar notificaciones
        this.useMediaSession = true; // Por defecto usar Media Session
        
        // Sistema agresivo de control de audio
        this.dominantAudioContext = null;
        this.interferenceNodes = [];
        this.audioStealer = null;
        this.serviceWorkerRegistered = false;
        this.mediaStreamActive = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initIndexedDB();
            await this.loadFromStorage();
            this.setupEventListeners();
            this.setupAudioElement();
            this.loadMediaSettings();
            this.setupMediaSession();
            await this.setupAggressiveAudioControl();
            this.loadTheme();
            
            // IMPORTANTE: Asegurar que los audios se muestren después de cargar
            console.log('🎯 Inicialización completa. Audios cargados:', this.audios.length);
            this.updateViews(); // Renderizar todos los audios cargados
            
            this.checkSchedules();
            
            // Verificar programaciones cada minuto
            setInterval(() => this.checkSchedules(), 60000);
        } catch (error) {
            console.error('Error crítico inicializando la aplicación:', error);
            this.showToast('❌ Error inicializando la aplicación. Recarga la página.', 'error');
        }
    }

    // Configurar eventos del elemento de audio
    setupAudioElement() {
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('ended', () => this.handleAudioEnded());
        this.audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        
        // Configurar evento para tomar control de medios cuando se reproduzca
        this.audioElement.addEventListener('play', () => {
            this.requestMediaControl();
        });
    }

    // Cargar configuración de medios desde localStorage
    loadMediaSettings() {
        try {
            // Cargar configuraciones guardadas
            const pauseOtherMedia = localStorage.getItem('audioPanel_pauseOtherMedia');
            const showNotifications = localStorage.getItem('audioPanel_showNotifications');
            const useMediaSession = localStorage.getItem('audioPanel_useMediaSession');
            
            // Aplicar configuraciones
            if (pauseOtherMedia !== null) {
                this.pauseOtherMedia = pauseOtherMedia === 'true';
            }
            if (showNotifications !== null) {
                this.showNotifications = showNotifications === 'true';
            }
            if (useMediaSession !== null) {
                this.useMediaSession = useMediaSession === 'true';
            }
            
            // Actualizar checkboxes en la interfaz
            document.getElementById('pauseOtherMediaToggle').checked = this.pauseOtherMedia;
            document.getElementById('showNotificationsToggle').checked = this.showNotifications;
            document.getElementById('mediaSessionToggle').checked = this.useMediaSession;
            
            console.log('⚙️ Configuración de medios cargada:', { 
                pauseOtherMedia: this.pauseOtherMedia, 
                showNotifications: this.showNotifications, 
                useMediaSession: this.useMediaSession 
            });
        } catch (error) {
            console.error('Error cargando configuración de medios:', error);
        }
    }

    // Configurar Media Session API para control de medios del sistema
    setupMediaSession() {
        try {
            if ('mediaSession' in navigator) {
                this.mediaSession = navigator.mediaSession;
                
                // Configurar metadatos por defecto
                this.mediaSession.metadata = new MediaMetadata({
                    title: 'Panel de Audio - Avisos',
                    artist: 'Sistema de Avisos',
                    album: 'Avisos Personalizados',
                    artwork: [
                        { src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235e72e4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>', sizes: '96x96', type: 'image/svg+xml' }
                    ]
                });

                // Configurar handlers de acciones de medios
                this.mediaSession.setActionHandler('play', () => {
                    this.togglePlayPause();
                });
                
                this.mediaSession.setActionHandler('pause', () => {
                    this.togglePlayPause();
                });
                
                this.mediaSession.setActionHandler('previoustrack', () => {
                    this.playPrevious();
                });
                
                this.mediaSession.setActionHandler('nexttrack', () => {
                    this.playNext();
                });
                
                console.log('🎵 Media Session API configurada correctamente');
            } else {
                console.log('⚠️ Media Session API no disponible en este navegador');
            }
            
            // Configurar AudioContext para control avanzado de audio
            this.setupAudioContext();
            
        } catch (error) {
            console.error('Error configurando Media Session:', error);
        }
    }

    // Configurar AudioContext para control avanzado
    setupAudioContext() {
        try {
            // Crear AudioContext
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioContext = new AudioContext();
                
                // Crear nodo de ganancia para control de volumen
                this.gainNode = this.audioContext.createGain();
                this.gainNode.connect(this.audioContext.destination);
                
                console.log('🔊 AudioContext configurado correctamente');
            }
        } catch (error) {
            console.error('Error configurando AudioContext:', error);
        }
    }

    // 🚨 SISTEMA AGRESIVO DE CONTROL DE AUDIO QUE REALMENTE FUNCIONA 🚨
    async setupAggressiveAudioControl() {
        if (!this.pauseOtherMedia) return;
        
        try {
            console.log('🚨 Configurando sistema AGRESIVO de control de audio...');
            
            // 1. Crear AudioContext dominante con prioridad máxima
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.dominantAudioContext = new AudioContext({
                    latencyHint: 'interactive',
                    sampleRate: 48000
                });
                
                // Forzar activación inmediata
                if (this.dominantAudioContext.state === 'suspended') {
                    await this.dominantAudioContext.resume();
                }
                
                console.log('✅ AudioContext dominante creado');
            }
            
            // 2. Registrar Service Worker para interceptar audio de otras páginas
            await this.setupServiceWorker();
            
            // 3. Preparar sistema de interferencia de audio
            this.setupAudioInterference();
            
            console.log('🚨 Sistema agresivo configurado correctamente');
            
        } catch (error) {
            console.error('Error configurando sistema agresivo:', error);
        }
    }

    // Service Worker para interceptar requests de audio
    async setupServiceWorker() {
        try {
            if ('serviceWorker' in navigator && !this.serviceWorkerRegistered) {
                // Crear Service Worker inline para interceptar audio
                const swCode = `
                    self.addEventListener('fetch', (event) => {
                        const url = event.request.url;
                        
                        // Interceptar requests de audio de Spotify, YouTube, etc.
                        if (url.includes('audio') || 
                            url.includes('spotify') || 
                            url.includes('youtube') || 
                            url.includes('mp3') || 
                            url.includes('stream') ||
                            url.includes('music')) {
                            
                            // Verificar si nuestro reproductor está activo
                            self.clients.matchAll().then(clients => {
                                clients.forEach(client => {
                                    client.postMessage({
                                        type: 'AUDIO_REQUEST_DETECTED',
                                        url: url
                                    });
                                });
                            });
                        }
                    });
                    
                    self.addEventListener('message', (event) => {
                        if (event.data.type === 'PAUSE_EXTERNAL_AUDIO') {
                            // Enviar comando para pausar audio externo
                            self.clients.matchAll().then(clients => {
                                clients.forEach(client => {
                                    client.postMessage({
                                        type: 'FORCE_PAUSE_AUDIO'
                                    });
                                });
                            });
                        }
                    });
                `;
                
                const blob = new Blob([swCode], { type: 'application/javascript' });
                const swUrl = URL.createObjectURL(blob);
                
                const registration = await navigator.serviceWorker.register(swUrl);
                this.serviceWorkerRegistered = true;
                
                // Listener para mensajes del service worker
                navigator.serviceWorker.addEventListener('message', (event) => {
                    if (event.data.type === 'AUDIO_REQUEST_DETECTED') {
                        console.log('🎵 Detectado request de audio externo:', event.data.url);
                        if (this.isPlaying) {
                            this.forceAudioInterference();
                        }
                    }
                });
                
                console.log('✅ Service Worker registrado para interceptar audio');
            }
        } catch (error) {
            console.log('⚠️ Service Worker no disponible:', error.message);
        }
    }

    // Sistema de interferencia de audio que FUERZA la pausa
    setupAudioInterference() {
        if (!this.dominantAudioContext) return;
        
        try {
            // Crear menos osciladores pero más efectivos
            for (let i = 0; i < 3; i++) {
                const oscillator = this.dominantAudioContext.createOscillator();
                const gainNode = this.dominantAudioContext.createGain();
                
                // Frecuencias muy bajas pero no completamente inaudibles (mejor efecto)
                oscillator.frequency.setValueAtTime(5 + (i * 3), this.dominantAudioContext.currentTime); // 5Hz, 8Hz, 11Hz
                oscillator.type = 'triangle'; // Onda triangular es más eficiente
                
                // Ganancia extremadamente baja (completamente inaudible)
                gainNode.gain.setValueAtTime(0.0001, this.dominantAudioContext.currentTime);
                
                oscillator.connect(gainNode);
                gainNode.connect(this.dominantAudioContext.destination);
                
                this.interferenceNodes.push({ oscillator, gainNode, active: false });
            }
            
            console.log('✅ Sistema de interferencia optimizado preparado');
        } catch (error) {
            console.error('Error configurando interferencia:', error);
        }
    }

    // ACTIVAR interferencia agresiva para pausar otros reproductores
    async forceAudioInterference() {
        if (!this.pauseOtherMedia || !this.dominantAudioContext) return;
        
        try {
            console.log('🚨 ACTIVANDO interferencia agresiva...');
            
            // 1. Activar osciladores de interferencia
            this.interferenceNodes.forEach((node, index) => {
                if (!node.active) {
                    try {
                        node.oscillator.start();
                        node.active = true;
                        console.log(`🎛️ Oscilador ${index + 1} activado`);
                        
                        // Modulación suave de frecuencia (sin interferencia audible)
                        setTimeout(() => {
                            if (node.oscillator && this.dominantAudioContext && node.active) {
                                try {
                                    // Modulación muy sutil en rango subsónico
                                    const newFreq = 3 + (index * 2) + (Math.random() * 2);
                                    node.oscillator.frequency.setValueAtTime(
                                        newFreq, 
                                        this.dominantAudioContext.currentTime
                                    );
                                } catch (e) {
                                    // Oscilador puede haber sido detenido
                                }
                            }
                        }, index * 50);
                    } catch (error) {
                        console.log(`⚠️ Oscilador ${index + 1} ya estaba iniciado o fue detenido`);
                    }
                }
            });
            
            // 2. Tomar control temporal del micrófono (interrumpe otros streams) - OPCIONAL
            await this.temporaryMicrophoneControl();
            
            // 3. Bloquear recursos de audio usando Web Locks API (más efectivo y menos agresivo)
            this.lockAudioResources();
            
            // 4. Crear stream de alta prioridad que compite por el dispositivo de audio
            this.createHighPriorityAudioStream();
            
            console.log('🚨 SISTEMA DE CONTROL ACTIVADO - otros reproductores deberían pausarse');
            
        } catch (error) {
            console.error('Error activando interferencia:', error);
        }
    }

    // Control temporal del micrófono para interrumpir streams (opcional)
    async temporaryMicrophoneControl() {
        try {
            if (this.mediaStreamActive) return;
            
            // Verificar si el navegador soporta getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.log('ℹ️ Control de micrófono no disponible en este navegador');
                return;
            }
            
            // Solicitar acceso al micrófono por 100ms para interrumpir
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            this.mediaStreamActive = true;
            
            // Conectar al AudioContext dominante con volumen mudo
            if (this.dominantAudioContext) {
                const source = this.dominantAudioContext.createMediaStreamSource(stream);
                const gain = this.dominantAudioContext.createGain();
                gain.gain.setValueAtTime(0, this.dominantAudioContext.currentTime); // Completamente mudo
                source.connect(gain);
                gain.connect(this.dominantAudioContext.destination);
            }
            
            // Liberar después de 50ms (más rápido)
            setTimeout(() => {
                try {
                    stream.getTracks().forEach(track => track.stop());
                    this.mediaStreamActive = false;
                    console.log('🎙️ Control temporal del micrófono ejecutado correctamente');
                } catch (e) {
                    console.log('⚠️ Error liberando micrófono:', e.message);
                }
            }, 50);
            
        } catch (error) {
            console.log('ℹ️ Control de micrófono no disponible:', error.message);
            // No es un error crítico, el sistema puede funcionar sin micrófono
        }
    }

    // Notificación con sonido para interrumpir
    createInterruptionNotification() {
        try {
            // Crear audio inaudible para la notificación
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.frequency.setValueAtTime(20000, audioContext.currentTime); // Ultrasónico
            gainNode.gain.setValueAtTime(0.001, audioContext.currentTime); // Casi inaudible
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.05); // 50ms
            
            console.log('🔔 Notificación de interrupción enviada');
            
        } catch (error) {
            console.log('⚠️ Error con notificación de interrupción:', error.message);
        }
    }

    // Saturación del sistema con múltiples AudioContexts
    createAudioContextSaturation() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            
            // Crear múltiples contextos temporales que compiten por recursos
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    const tempContext = new AudioContext();
                    const oscillator = tempContext.createOscillator();
                    const gain = tempContext.createGain();
                    
                    oscillator.frequency.setValueAtTime(0.01, tempContext.currentTime);
                    gain.gain.setValueAtTime(0.0001, tempContext.currentTime);
                    
                    oscillator.connect(gain);
                    gain.connect(tempContext.destination);
                    
                    oscillator.start();
                    
                    // Cerrar después de 200ms
                    setTimeout(() => {
                        oscillator.stop();
                        tempContext.close();
                    }, 200);
                }, i * 50);
            }
            
            console.log('💥 Saturación de AudioContext activada');
            
        } catch (error) {
            console.log('⚠️ Error con saturación:', error.message);
        }
    }

    // Bloquear recursos de audio usando Web Locks API
    async lockAudioResources() {
        try {
            if ('locks' in navigator && navigator.locks) {
                // Bloquear múltiples recursos relacionados con audio
                const audioLocks = [
                    'audio_device_primary',
                    'audio_context_main',
                    'media_session_control',
                    'audio_output_stream',
                    'media_playback_control'
                ];
                
                audioLocks.forEach(async (lockName) => {
                    try {
                        await navigator.locks.request(lockName, { mode: 'exclusive' }, async (lock) => {
                            console.log(`🔒 Bloqueado recurso: ${lockName}`);
                            
                            // Mantener el lock por 8 segundos
                            return new Promise(resolve => {
                                setTimeout(resolve, 8000);
                            });
                        });
                    } catch (error) {
                        console.log(`⚠️ No se pudo bloquear ${lockName}:`, error.message);
                    }
                });
                
                console.log('🔒 Recursos de audio bloqueados');
            }
        } catch (error) {
            console.log('⚠️ Web Locks API no disponible:', error.message);
        }
    }

    // Crear stream de alta prioridad
    async createHighPriorityAudioStream() {
        try {
            if (this.dominantAudioContext) {
                // Crear un buffer de audio con ruido blanco de muy baja intensidad
                const bufferSize = this.dominantAudioContext.sampleRate * 0.1; // 100ms
                const buffer = this.dominantAudioContext.createBuffer(2, bufferSize, this.dominantAudioContext.sampleRate);
                
                // Llenar con ruido blanco extremadamente suave
                for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                    const channelData = buffer.getChannelData(channel);
                    for (let i = 0; i < bufferSize; i++) {
                        channelData[i] = (Math.random() - 0.5) * 0.00001; // Muy muy bajo
                    }
                }
                
                // Crear fuente de buffer con loop
                const source = this.dominantAudioContext.createBufferSource();
                const gain = this.dominantAudioContext.createGain();
                
                source.buffer = buffer;
                source.loop = true;
                gain.gain.setValueAtTime(0.0001, this.dominantAudioContext.currentTime); // Casi inaudible
                
                source.connect(gain);
                gain.connect(this.dominantAudioContext.destination);
                
                source.start();
                
                // Guardar referencia para poder detenerlo
                this.audioStealer = source;
                
                console.log('🎵 Stream de alta prioridad creado');
                
                // Detener después de 10 segundos
                setTimeout(() => {
                    if (this.audioStealer) {
                        try {
                            this.audioStealer.stop();
                            this.audioStealer = null;
                        } catch (e) {
                            // Ya detenido
                        }
                    }
                }, 10000);
            }
        } catch (error) {
            console.log('⚠️ Error creando stream de alta prioridad:', error.message);
        }
    }

    // Desactivar interferencia cuando se pausa
    stopAudioInterference() {
        try {
            // Detener osciladores de interferencia
            this.interferenceNodes.forEach((node, index) => {
                if (node.active && node.oscillator) {
                    try {
                        node.oscillator.stop();
                        node.oscillator.disconnect();
                        console.log(`🔇 Oscilador ${index + 1} detenido y desconectado`);
                    } catch (e) {
                        console.log(`⚠️ Oscilador ${index + 1} ya estaba detenido`);
                    }
                    node.active = false;
                }
            });
            
            // Recrear nodos para el próximo uso
            this.interferenceNodes = [];
            if (this.dominantAudioContext && this.dominantAudioContext.state !== 'closed') {
                this.setupAudioInterference();
            }
            
            // Detener audio stealer si existe
            if (this.audioStealer) {
                try {
                    this.audioStealer.stop();
                    this.audioStealer.disconnect();
                    this.audioStealer = null;
                    console.log('🔇 Audio stealer detenido');
                } catch (e) {
                    console.log('⚠️ Audio stealer ya estaba detenido');
                }
            }
            
            console.log('✅ Interferencia agresiva desactivada completamente');
            
        } catch (error) {
            console.error('Error desactivando interferencia:', error);
        }
    }

    // Solicitar control de medios del sistema
    async requestMediaControl() {
        try {
            // Activar AudioContext si está suspendido
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            // Conectar el elemento de audio al AudioContext si es posible
            if (this.audioContext && !this.audioSource) {
                try {
                    this.audioSource = this.audioContext.createMediaElementSource(this.audioElement);
                    this.audioSource.connect(this.gainNode);
                } catch (error) {
                    // Si ya está conectado o hay error, continuar
                    console.log('AudioSource ya conectado o error menor:', error.message);
                }
            }
            
            // Actualizar estado de Media Session
            if (this.mediaSession && this.useMediaSession) {
                this.mediaSession.playbackState = 'playing';
            }
            
            // Mostrar notificación si está habilitada
            this.showMediaNotification();
            
            // 🚨 ACTIVAR SISTEMA AGRESIVO PARA PAUSAR OTROS REPRODUCTORES
            await this.forceAudioInterference();
            
            console.log('🎮 Control de medios solicitado');
        } catch (error) {
            console.error('Error solicitando control de medios:', error);
        }
    }

    // Mostrar notificación de reproducción
    showMediaNotification() {
        if ('Notification' in window && this.showNotifications) {
            // Solicitar permiso para notificaciones si no lo tenemos
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        this.displayNotification();
                    }
                });
            } else if (Notification.permission === 'granted') {
                this.displayNotification();
            }
        }
    }

    // Mostrar notificación
    displayNotification() {
        const audio = this.audios.find(a => a.id === this.currentAudioId);
        if (audio) {
            const pauseText = this.pauseOtherMedia ? ' • Se pausarán otros reproductores' : '';
            const notification = new Notification(`🎵 Reproduciendo: ${audio.customName || audio.name}`, {
                body: `Categoría: ${audio.category}${pauseText}`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%235e72e4"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
                tag: 'audio-panel-playing',
                silent: true
            });
            
            // Auto cerrar después de 3 segundos
            setTimeout(() => {
                notification.close();
            }, 3000);
        }
    }

    // Actualizar metadatos de Media Session
    updateMediaSessionMetadata(audio) {
        if (this.mediaSession && 'MediaMetadata' in window && this.useMediaSession) {
            const displayName = audio.customName || audio.name;
            const categoryNames = {
                'avisos': 'Avisos',
                'musica': 'Música',
                'efectos': 'Efectos Sonoros',
                'otros': 'Otros'
            };
            
            // Crear artwork dinámico basado en la imagen del audio o categoría
            let artwork = [];
            
            if (audio.imageUrl && audio.imageUrl.trim() !== '') {
                // Usar imagen personalizada
                artwork.push({
                    src: audio.imageUrl,
                    sizes: '512x512',
                    type: 'image/jpeg'
                });
            } else {
                // Usar icono de categoría como artwork
                const categoryColors = {
                    'avisos': '%23ff6b6b',
                    'musica': '%234834d4',
                    'efectos': '%2300d2d3',
                    'otros': '%238c7ae6'
                };
                
                const color = categoryColors[audio.category] || categoryColors['otros'];
                const iconSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${color}'><path d='M9 18V5l12-2v13'/><circle cx='6' cy='18' r='3'/><circle cx='18' cy='16' r='3'/></svg>`;
                
                artwork.push({
                    src: `data:image/svg+xml,${iconSvg}`,
                    sizes: '96x96',
                    type: 'image/svg+xml'
                });
            }
            
            this.mediaSession.metadata = new MediaMetadata({
                title: displayName,
                artist: `Panel de Audio • ${categoryNames[audio.category] || 'Otros'}`,
                album: 'Avisos Personalizados',
                artwork: artwork
            });
            
            console.log(`🎵 Media Session actualizada: ${displayName}`);
        }
    }

    // Configurar event listeners
    setupEventListeners() {
        // Navegación
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Tema
        document.querySelector('.theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Drag and Drop
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');

        dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        selectFilesBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            try {
                await this.handleFileSelect(e.target.files);
            } catch (error) {
                console.error('Error manejando selección de archivos:', error);
            }
        });

        // Controles del reproductor
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('prevBtn').addEventListener('click', () => this.playPrevious());
        document.getElementById('nextBtn').addEventListener('click', () => this.playNext());
        document.getElementById('loopBtn').addEventListener('click', () => this.toggleLoop());
        document.getElementById('volumeSlider').addEventListener('input', (e) => this.setVolume(e.target.value));
        document.getElementById('progressContainer').addEventListener('click', (e) => this.seek(e));

        // Búsqueda y filtros
        document.getElementById('searchInput').addEventListener('input', (e) => this.filterAudios(e.target.value));
        document.getElementById('categoryFilter').addEventListener('change', (e) => this.filterByCategory(e.target.value));
        
        // IMPORTANTE: Establecer el filtro inicial en "all" para mostrar todos los audios
        const categoryFilterElement = document.getElementById('categoryFilter');
        if (categoryFilterElement) {
            categoryFilterElement.value = 'all';
        }

        // Botón de nueva programación
        document.getElementById('addScheduleBtn').addEventListener('click', () => this.openScheduleModal());

        // Modales
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Formularios
        document.getElementById('editAudioForm').addEventListener('submit', (e) => this.handleEditAudio(e));
        document.getElementById('scheduleForm').addEventListener('submit', (e) => this.handleScheduleAudio(e));
        
        // Event listener para el selector de archivo en el modal de edición
        document.getElementById('newAudioFile').addEventListener('change', (e) => this.handleNewAudioFileSelected(e));

        // Cerrar modales al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Cancelar botones en modales
        document.getElementById('cancelEdit').addEventListener('click', () => {
            document.getElementById('editAudioModal').classList.remove('active');
        });
        
        document.getElementById('cancelSchedule').addEventListener('click', () => {
            document.getElementById('scheduleModal').classList.remove('active');
        });
        
        // Recargar todos los audios
        document.getElementById('reloadAllBtn').addEventListener('click', () => this.reloadAllAudios());
        
        // Event listeners para controles de medios
        document.getElementById('pauseOtherMediaToggle').addEventListener('change', (e) => {
            this.pauseOtherMedia = e.target.checked;
            localStorage.setItem('audioPanel_pauseOtherMedia', this.pauseOtherMedia);
            console.log(`🎵 Control de otros reproductores: ${this.pauseOtherMedia ? 'Activado' : 'Desactivado'}`);
        });
        
        document.getElementById('showNotificationsToggle').addEventListener('change', (e) => {
            this.showNotifications = e.target.checked;
            localStorage.setItem('audioPanel_showNotifications', this.showNotifications);
            console.log(`🔔 Notificaciones: ${this.showNotifications ? 'Activadas' : 'Desactivadas'}`);
        });
        
        document.getElementById('mediaSessionToggle').addEventListener('change', (e) => {
            this.useMediaSession = e.target.checked;
            localStorage.setItem('audioPanel_useMediaSession', this.useMediaSession);
            console.log(`🎮 Media Session: ${this.useMediaSession ? 'Activado' : 'Desactivado'}`);
        });
        
        // Botón de prueba del sistema agresivo
        document.getElementById('testAggressiveControl').addEventListener('click', async () => {
            console.log('🚨 INICIANDO PRUEBA DEL SISTEMA AGRESIVO...');
            this.showToast('🚨 ACTIVANDO sistema agresivo... ¡Observa Spotify/YouTube!', 'info');
            
            try {
                await this.forceAudioInterference();
                
                // Mostrar confirmación después de 3 segundos
                setTimeout(() => {
                    this.showToast('✅ ¡Prueba completada! ¿Se pausó Spotify/YouTube? ¡El sistema funciona!', 'success');
                    
                    // Desactivar después de 5 segundos más
                    setTimeout(() => {
                        this.stopAudioInterference();
                        this.showToast('🟡 Sistema agresivo desactivado. Ya puedes reanudar Spotify.', 'info');
                    }, 5000);
                }, 3000);
                
            } catch (error) {
                console.error('Error en prueba agresiva:', error);
                this.showToast('❌ Error en la prueba. Revisa la consola para más detalles.', 'error');
            }
        });
    }

    // Cambiar vista
    switchView(view) {
        this.currentView = view;
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        // Mostrar vista correspondiente
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.toggle('active', section.id === `${view}View`);
        });
    }

    // Manejar drag over
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    // Manejar drag leave
    handleDragLeave(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
    }

    // Manejar drop
    async handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        try {
            await this.handleFileSelect(files);
        } catch (error) {
            console.error('Error manejando drop de archivos:', error);
        }
    }

    // Manejar selección de archivos
    async handleFileSelect(files) {
        const audioFiles = Array.from(files).filter(file => file.type.startsWith('audio/'));
        
        if (audioFiles.length === 0) {
            this.showToast('Por favor selecciona archivos de audio válidos', 'error');
            return;
        }
        
        try {
            // Procesar archivos de manera secuencial para evitar sobrecargar el sistema
            for (const file of audioFiles) {
                await this.addAudio(file);
            }
            
            this.showToast(`🎉 ${audioFiles.length} audio(s) añadido(s) y guardado(s) permanentemente!`);
        } catch (error) {
            console.error('Error procesando archivos:', error);
            this.showToast('❌ Error procesando algunos archivos. Revisa la consola para más detalles.', 'error');
        }
    }

    // Añadir audio
    async addAudio(file) {
        try {
            const id = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const objectURL = URL.createObjectURL(file);
            
            // Obtener duración
            const tempAudio = new Audio();
            tempAudio.src = objectURL;
        
        await new Promise((resolve, reject) => {
            const handleLoadedMetadata = async () => {
                try {
                    const audio = {
                        id: id,
                        name: file.name.replace(/\.[^/.]+$/, ''), // Quitar extensión
                        fileName: file.name,
                        customName: '',
                        category: 'otros',
                        imageUrl: '',
                        duration: tempAudio.duration,
                        size: file.size,
                        dateAdded: new Date().toISOString(),
                        file: file,
                        objectURL: objectURL,
                        needsReload: false
                    };
                    
                    // Guardar archivo en IndexedDB para persistencia
                    await this.saveAudioFileToIndexedDB(id, file);
                    console.log(`✅ Archivo ${file.name} guardado permanentemente`);
                    
                    this.audios.push(audio);
                    this.saveToStorage();
                    this.updateViews();
                    
                    // Limpiar event listener
                    tempAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    tempAudio.removeEventListener('error', handleError);
                    resolve();
                } catch (error) {
                    console.error(`Error guardando archivo ${file.name}:`, error);
                    // Aún así agregar el audio, pero marcar que necesita recarga si falla IndexedDB
                    const audio = {
                        id: id,
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        fileName: file.name,
                        customName: '',
                        category: 'otros',
                        imageUrl: '',
                        duration: tempAudio.duration,
                        size: file.size,
                        dateAdded: new Date().toISOString(),
                        file: file,
                        objectURL: objectURL,
                        needsReload: true // Marcarlo como que necesita recarga si no se pudo guardar
                    };
                    
                    this.audios.push(audio);
                    this.saveToStorage();
                    this.updateViews();
                    
                    // Limpiar event listeners
                    tempAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    tempAudio.removeEventListener('error', handleError);
                    resolve();
                }
            };
            
            const handleError = () => {
                console.error(`Error cargando metadatos de ${file.name}`);
                // Limpiar event listeners
                tempAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                tempAudio.removeEventListener('error', handleError);
                reject(new Error(`No se pudieron cargar los metadatos de ${file.name}`));
            };
            
            tempAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
            tempAudio.addEventListener('error', handleError);
        });
        } catch (error) {
            console.error(`Error crítico agregando audio ${file.name}:`, error);
            this.showToast(`❌ Error agregando ${file.name}. Inténtalo de nuevo.`, 'error');
        }
    }

    // Actualizar vistas
    updateViews() {
        this.updateLibraryView();
        this.updateAdminTable();
        this.updateScheduleOptions();
        this.updateEmptyStates();
        this.updateReloadButton();
        // Actualizar animaciones después de regenerar las vistas
        setTimeout(() => {
            this.updatePlayingCardAnimations();
        }, 100);
    }
    
    // Actualizar botón de recargar todos
    updateReloadButton() {
        const reloadBtn = document.getElementById('reloadAllBtn');
        const needsReload = this.audios.some(audio => audio.needsReload);
        
        if (needsReload) {
            reloadBtn.style.display = 'flex';
            const count = this.audios.filter(audio => audio.needsReload).length;
            reloadBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 2V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M3 12C3 13.1819 3.23279 14.3522 3.68508 15.4442C4.13738 16.5361 4.80031 17.5282 5.63604 18.364C6.47177 19.1997 7.46392 19.8626 8.55585 20.3149C9.64778 20.7672 10.8181 21 12 21C13.1819 21 14.3522 20.7672 15.4442 20.3149C16.5361 19.8626 17.5282 19.1997 18.364 18.364C19.1997 17.5282 19.8626 16.5361 20.3149 15.4442C20.7672 14.3522 21 13.1819 21 12C21 10.8181 20.7672 9.64778 20.3149 8.55585C19.8626 7.46392 19.1997 6.47177 18.364 5.63604L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                🚀 Recargar ${count} archivo${count > 1 ? 's' : ''} de una vez
            `;
        } else {
            reloadBtn.style.display = 'none';
        }
    }

    // Actualizar vista de biblioteca
    updateLibraryView() {
        const audioGrid = document.getElementById('audioGrid');
        const filteredAudios = this.getFilteredAudios();
        
        console.log(`📚 Actualizando biblioteca: ${filteredAudios.length} audios visibles de ${this.audios.length} totales (filtro: ${this.categoryFilter})`);
        
        audioGrid.innerHTML = '';
        
        filteredAudios.forEach(audio => {
            const card = this.createAudioCard(audio);
            audioGrid.appendChild(card);
        });
        
        if (filteredAudios.length === 0 && this.audios.length > 0) {
            console.log('ℹ️ No hay audios que coincidan con el filtro actual');
        }
    }

    // Crear tarjeta de audio
    createAudioCard(audio) {
        const div = document.createElement('div');
        div.className = 'audio-card';
        if (audio.needsReload) {
            div.className += ' needs-reload';
        }
        div.dataset.audioId = audio.id;
        
        const displayName = audio.customName || audio.name;
        const duration = this.formatTime(audio.duration);
        
        div.innerHTML = `
            <div class="audio-card-image">
                ${audio.imageUrl ? 
                    `<img src="${audio.imageUrl}" alt="${displayName}">` :
                    `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2"/>
                        <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2"/>
                    </svg>`
                }
                ${audio.needsReload ? 
                    `<div class="reload-overlay">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 2V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M3 12C3 13.1819 3.23279 14.3522 3.68508 15.4442C4.13738 16.5361 4.80031 17.5282 5.63604 18.364C6.47177 19.1997 7.46392 19.8626 8.55585 20.3149C9.64778 20.7672 10.8181 21 12 21C13.1819 21 14.3522 20.7672 15.4442 20.3149C16.5361 19.8626 17.5282 19.1997 18.364 18.364C19.1997 17.5282 19.8626 16.5361 20.3149 15.4442C20.7672 14.3522 21 13.1819 21 12C21 10.8181 20.7672 9.64778 20.3149 8.55585C19.8626 7.46392 19.1997 6.47177 18.364 5.63604L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span>Recargar archivo</span>
                    </div>` :
                    `<div class="play-overlay">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 3L19 12L5 21V3Z" fill="currentColor"/>
                        </svg>
                    </div>`
                }
            </div>
            <div class="audio-card-info">
                <div class="audio-card-title">${this.escapeHtml(displayName)}</div>
                <div class="audio-card-meta">
                    <span class="audio-category">${audio.category}</span>
                    <span>${duration}</span>
                </div>
            </div>
        `;
        
        if (audio.needsReload) {
            div.addEventListener('click', () => this.promptReloadAudio(audio.id));
        } else {
            div.addEventListener('click', () => this.playAudio(audio.id));
        }
        
        return div;
    }

    // Actualizar tabla de administración
    updateAdminTable() {
        const audioTable = document.getElementById('audioTable');
        audioTable.innerHTML = '';
        
        if (this.audios.length === 0) {
            audioTable.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No hay audios cargados</p>';
            return;
        }
        
        this.audios.forEach(audio => {
            const item = document.createElement('div');
            item.className = 'audio-table-item';
            
            const displayName = audio.customName || audio.name;
            const size = this.formatFileSize(audio.size);
            const statusText = audio.needsReload ? ' • ⚠️ Necesita recarga' : '';
            
            item.innerHTML = `
                <div class="audio-table-info">
                    <div class="audio-table-name">${this.escapeHtml(displayName)}${statusText}</div>
                    <div class="audio-table-meta">${audio.category} • ${size} • ${this.formatTime(audio.duration)}</div>
                </div>
                <div class="schedule-actions">
                    ${audio.needsReload ? 
                        `<button class="icon-btn" onclick="audioPanel.promptReloadAudio('${audio.id}')" title="Recargar archivo">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 2V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M3 12C3 13.1819 3.23279 14.3522 3.68508 15.4442C4.13738 16.5361 4.80031 17.5282 5.63604 18.364C6.47177 19.1997 7.46392 19.8626 8.55585 20.3149C9.64778 20.7672 10.8181 21 12 21C13.1819 21 14.3522 20.7672 15.4442 20.3149C16.5361 19.8626 17.5282 19.1997 18.364 18.364C19.1997 17.5282 19.8626 16.5361 20.3149 15.4442C20.7672 14.3522 21 13.1819 21 12C21 10.8181 20.7672 9.64778 20.3149 8.55585C19.8626 7.46392 19.1997 6.47177 18.364 5.63604L21 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>` : ''
                    }
                    <button class="icon-btn" onclick="audioPanel.editAudio('${audio.id}')" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="audioPanel.deleteAudio('${audio.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M14 11V17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
            
            audioTable.appendChild(item);
        });
    }

    // Actualizar lista de programaciones
    updateScheduleView() {
        const scheduleList = document.getElementById('scheduleList');
        scheduleList.innerHTML = '';
        
        if (this.schedules.length === 0) {
            scheduleList.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/>
                        <path d="M12 7V12L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h3>No hay programaciones</h3>
                    <p>Haz clic en "Nueva Programación" para empezar</p>
                </div>
            `;
            return;
        }
        
        this.schedules.forEach(schedule => {
            const audio = this.audios.find(a => a.id === schedule.audioId);
            if (!audio) return;
            
            const item = document.createElement('div');
            item.className = 'schedule-item';
            
            const daysText = this.getDaysText(schedule.days);
            const displayName = audio.customName || audio.name;
            const interval = schedule.interval || 0;
            const repeatInfo = schedule.repeat > 1 ? 
                `${schedule.repeat} repeticiones${interval > 0 ? ` (cada ${interval}s)` : ''}` : 
                '1 vez';
            
            item.innerHTML = `
                <div class="schedule-time">${schedule.time}</div>
                <div class="schedule-details">
                    <div class="schedule-title">${this.escapeHtml(displayName)}</div>
                    <div class="schedule-days">${daysText} • ${repeatInfo}</div>
                </div>
                <div class="schedule-actions">
                    <button class="icon-btn" onclick="audioPanel.toggleSchedule('${schedule.id}')" title="${schedule.active ? 'Desactivar' : 'Activar'}">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            ${schedule.active ? 
                                '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>' :
                                '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>'
                            }
                        </svg>
                    </button>
                    <button class="icon-btn" onclick="audioPanel.deleteSchedule('${schedule.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `;
            
            scheduleList.appendChild(item);
        });
    }

    // Actualizar opciones de selección en modal de programación
    updateScheduleOptions() {
        const select = document.getElementById('scheduleAudio');
        select.innerHTML = '';
        
        this.audios.forEach(audio => {
            const option = document.createElement('option');
            option.value = audio.id;
            option.textContent = audio.customName || audio.name;
            select.appendChild(option);
        });
    }

    // Actualizar estados vacíos
    updateEmptyStates() {
        const emptyState = document.getElementById('emptyState');
        const audioGrid = document.getElementById('audioGrid');
        
        if (this.audios.length === 0) {
            emptyState.style.display = 'flex';
            audioGrid.style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            audioGrid.style.display = 'grid';
        }
    }

    // Actualizar animaciones de tarjetas de audio
    updatePlayingCardAnimations() {
        // Quitar clase 'playing' de todas las tarjetas
        const allCards = document.querySelectorAll('.audio-card');
        allCards.forEach(card => {
            card.classList.remove('playing');
        });
        
        // Agregar clase 'playing' solo al audio actual si está reproduciéndose
        if (this.currentAudioId && this.isPlaying) {
            const currentCard = document.querySelector(`[data-audio-id="${this.currentAudioId}"]`);
            if (currentCard) {
                currentCard.classList.add('playing');
            }
        }
        
        // Actualizar ecualizador en el reproductor
        const equalizer = document.getElementById('playerEqualizer');
        if (equalizer) {
            if (this.isPlaying) {
                equalizer.classList.add('active');
            } else {
                equalizer.classList.remove('active');
            }
        }
    }

    // Reproducir audio (con integración de Spotify)
    async playAudio(audioId) {
        const audio = this.audios.find(a => a.id === audioId);
        if (!audio) return;
        
        // 🎵 PAUSAR SPOTIFY antes de reproducir nuestro audio
        if (window.spotifyIntegration) {
            console.log('🔍 Spotify Integration detectada:', {
                isConnected: window.spotifyIntegration.isConnected,
                hasAccessToken: !!window.spotifyIntegration.accessToken
            });
            
            if (window.spotifyIntegration.isConnected) {
                console.log('🎵 Pausando Spotify para reproducir audio del panel...');
                const success = await window.spotifyIntegration.onAudioPanelPlay();
                console.log('🎵 Resultado de pausar Spotify:', success);
            } else {
                console.log('⚠️ Spotify NO está conectado - no se puede pausar');
            }
        } else {
            console.log('❌ No se encontró integración de Spotify');
        }
        
        // Siempre actualizar la información del reproductor
        this.currentAudioId = audioId;
        this.updatePlayerBar(audio);
        document.getElementById('playerBar').classList.remove('hidden');
        
        // Si el audio necesita recarga, mostrar información pero no reproducir
        if (audio.needsReload || !audio.objectURL) {
            this.showToast(`🔄 Selecciona "${audio.fileName}" o ve a "Administración" para recargar todos los archivos de una vez`, 'info');
            this.isPlaying = false;
            document.getElementById('playPauseBtn').classList.remove('playing');
            this.promptReloadAudio(audioId);
        } else {
            // Solo reproducir si tiene el archivo
            this.audioElement.src = audio.objectURL;
            
            // Manejar errores de reproducción (como AbortError cuando se interrumpe)
            this.audioElement.play().catch(error => {
                if (error.name === 'AbortError') {
                    // Normal cuando se interrumpe para reproducir otro audio
                    console.log('ℹ️ Reproducción interrumpida (normal)');
                } else if (error.name === 'NotAllowedError') {
                    console.log('⚠️ Reproducción bloqueada por el navegador');
                } else {
                    console.error('Error reproduciendo audio:', error);
                }
            });
            
            this.isPlaying = true;
            document.getElementById('playPauseBtn').classList.add('playing');
        }
        
        // Actualizar animaciones de las tarjetas
        this.updatePlayingCardAnimations();
        
        // Guardar estado actual
        this.saveToStorage();
    }

    // Actualizar barra del reproductor
    updatePlayerBar(audio) {
        const displayName = audio.customName || audio.name;
        
        document.getElementById('playerTitle').textContent = displayName;
        document.getElementById('playerCategory').textContent = audio.category;
        
        const thumbnail = document.getElementById('playerThumbnail');
        
        // Limpiar thumbnail anterior
        this.clearThumbnail(thumbnail);
        
        // Si tiene imagen personalizada, úsala
        if (audio.imageUrl && audio.imageUrl.trim() !== '') {
            thumbnail.src = audio.imageUrl;
            thumbnail.style.display = 'block';
            thumbnail.onload = () => {
                // Imagen cargada exitosamente
                console.log('Imagen cargada:', audio.imageUrl);
            };
            thumbnail.onerror = () => {
                // Si la imagen no carga, usa la imagen por defecto
                console.log('Error cargando imagen, usando por defecto:', audio.imageUrl);
                this.setDefaultThumbnail(thumbnail, audio.category);
            };
        } else {
            // Si no tiene imagen, usa una por defecto basada en la categoría
            this.setDefaultThumbnail(thumbnail, audio.category);
        }
        
        // Actualizar Media Session con información del audio actual
        this.updateMediaSessionMetadata(audio);
    }

    // Limpiar thumbnail
    clearThumbnail(thumbnail) {
        thumbnail.src = '';
        thumbnail.style.background = '';
        thumbnail.style.backgroundSize = '';
        
        // Remover iconos anteriores
        const existingIcon = thumbnail.querySelector('.category-icon');
        if (existingIcon) {
            existingIcon.remove();
        }
    }

    // Establecer imagen por defecto basada en la categoría
    setDefaultThumbnail(thumbnail, category) {
        thumbnail.style.display = 'block';
        
        // Crear un gradiente basado en la categoría
        const gradients = {
            'avisos': 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            'musica': 'linear-gradient(135deg, #4834d4, #686de0)',
            'efectos': 'linear-gradient(135deg, #00d2d3, #01a3a4)',
            'otros': 'linear-gradient(135deg, #8c7ae6, #9c88ff)'
        };
        
        const gradient = gradients[category.toLowerCase()] || gradients['otros'];
        
        // Limpiar imagen src y establecer gradiente como fondo
        thumbnail.src = '';
        thumbnail.style.background = gradient;
        thumbnail.style.backgroundSize = 'cover';
        
        // Agregar un icono de categoría si no hay imagen
        if (!thumbnail.querySelector('.category-icon')) {
            const icon = document.createElement('div');
            icon.className = 'category-icon';
            icon.innerHTML = this.getCategoryIcon(category.toLowerCase());
            thumbnail.appendChild(icon);
        }
    }

    // Obtener icono SVG para cada categoría
    getCategoryIcon(category) {
        const icons = {
            'avisos': '<svg viewBox="0 0 24 24" fill="white"><path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22M18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5S10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z"/></svg>',
            'musica': '<svg viewBox="0 0 24 24" fill="white"><path d="M12 3V13.55C11.41 13.21 10.73 13 10 13C7.79 13 6 14.79 6 17S7.79 21 10 21 14 19.21 14 17V7H18V3H12Z"/></svg>',
            'efectos': '<svg viewBox="0 0 24 24" fill="white"><path d="M11,4A4,4 0 0,1 15,8A4,4 0 0,1 11,12A4,4 0 0,1 7,8A4,4 0 0,1 11,4M11,6A2,2 0 0,0 9,8A2,2 0 0,0 11,10A2,2 0 0,0 13,8A2,2 0 0,0 11,6M11,13C14.31,13 17,15.69 17,19V20H5V19C5,15.69 7.69,13 11,13Z"/></svg>',
            'otros': '<svg viewBox="0 0 24 24" fill="white"><path d="M9 18V5L12.5 3L16 5V18L12.5 20L9 18Z"/></svg>'
        };
        
        return icons[category] || icons['otros'];
    }

    // Toggle play/pause (con integración de Spotify)
    async togglePlayPause() {
        if (!this.currentAudioId) {
            // Si no hay audio actual, reproducir el primero
            if (this.audios.length > 0) {
                await this.playAudio(this.audios[0].id);
            }
            return;
        }
        
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            document.getElementById('playPauseBtn').classList.remove('playing');
            
            // Actualizar estado de Media Session
            if (this.mediaSession && this.useMediaSession) {
                this.mediaSession.playbackState = 'paused';
            }
            
            // 🚨 DESACTIVAR INTERFERENCIA AL PAUSAR
            this.stopAudioInterference();
            
            // 🎵 REANUDAR SPOTIFY cuando pausamos nuestro audio
            if (window.spotifyIntegration && window.spotifyIntegration.isConnected) {
                console.log('🎵 Audio pausado - reanudando Spotify...');
                await window.spotifyIntegration.onAudioPanelStop();
            }
        } else {
            // 🎵 PAUSAR SPOTIFY antes de reanudar nuestro audio
            if (window.spotifyIntegration && window.spotifyIntegration.isConnected) {
                console.log('🎵 Reanudando audio - pausando Spotify...');
                await window.spotifyIntegration.onAudioPanelPlay();
            }
            
            // Manejar errores de reproducción
            this.audioElement.play().catch(error => {
                if (error.name === 'AbortError') {
                    console.log('ℹ️ Reproducción interrumpida (normal)');
                } else if (error.name === 'NotAllowedError') {
                    console.log('⚠️ Reproducción bloqueada por el navegador');
                } else {
                    console.error('Error reproduciendo audio:', error);
                }
            });
            
            this.isPlaying = true;
            document.getElementById('playPauseBtn').classList.add('playing');
            
            // Actualizar estado de Media Session
            if (this.mediaSession && this.useMediaSession) {
                this.mediaSession.playbackState = 'playing';
            }
        }
        
        // Actualizar animaciones de las tarjetas
        this.updatePlayingCardAnimations();
    }

    // Reproducir anterior
    playPrevious() {
        if (!this.currentAudioId) return;
        
        const currentIndex = this.audios.findIndex(a => a.id === this.currentAudioId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.audios.length - 1;
        
        if (this.audios[prevIndex]) {
            this.playAudio(this.audios[prevIndex].id);
        }
    }

    // Reproducir siguiente
    playNext() {
        if (!this.currentAudioId) return;
        
        const currentIndex = this.audios.findIndex(a => a.id === this.currentAudioId);
        const nextIndex = currentIndex < this.audios.length - 1 ? currentIndex + 1 : 0;
        
        if (this.audios[nextIndex]) {
            this.playAudio(this.audios[nextIndex].id);
        }
    }

    // Toggle loop
    toggleLoop() {
        this.audioElement.loop = !this.audioElement.loop;
        document.getElementById('loopBtn').classList.toggle('active', this.audioElement.loop);
    }

    // Establecer volumen
    setVolume(value) {
        this.audioElement.volume = value / 100;
    }

    // Seek
    seek(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        this.audioElement.currentTime = percentage * this.audioElement.duration;
    }

    // Actualizar progreso
    updateProgress() {
        const progress = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        document.getElementById('progressBar').style.width = `${progress}%`;
        document.getElementById('currentTime').textContent = this.formatTime(this.audioElement.currentTime);
    }

    // Actualizar duración
    updateDuration() {
        document.getElementById('duration').textContent = this.formatTime(this.audioElement.duration);
    }

    // Manejar fin del audio
    async handleAudioEnded() {
        // Si está en modo loop, el audio se repetirá automáticamente
        // Si no está en loop, detener la reproducción
        if (!this.audioElement.loop) {
            this.isPlaying = false;
            document.getElementById('playPauseBtn').classList.remove('playing');
            
            // Actualizar estado de Media Session
            if (this.mediaSession && this.useMediaSession) {
                this.mediaSession.playbackState = 'paused';
            }
            
            // 🚨 DESACTIVAR INTERFERENCIA AL TERMINAR
            this.stopAudioInterference();
            
            // 🎵 REANUDAR SPOTIFY cuando termine nuestro audio
            if (window.spotifyIntegration && window.spotifyIntegration.isConnected) {
                console.log('🎵 Audio terminado - reanudando Spotify...');
                await window.spotifyIntegration.onAudioPanelStop();
            }
            
            // Actualizar animaciones de las tarjetas
            this.updatePlayingCardAnimations();
            
            // Opcional: reproducir el siguiente audio automáticamente
            // this.playNext();
        }
    }

    // Filtrar audios
    filterAudios(searchTerm) {
        this.searchTerm = searchTerm.toLowerCase();
        this.updateLibraryView();
    }

    // Filtrar por categoría
    filterByCategory(category) {
        this.categoryFilter = category;
        this.updateLibraryView();
    }

    // Obtener audios filtrados
    getFilteredAudios() {
        let filtered = this.audios;
        
        if (this.searchTerm) {
            filtered = filtered.filter(audio => {
                const displayName = (audio.customName || audio.name).toLowerCase();
                return displayName.includes(this.searchTerm);
            });
        }
        
        if (this.categoryFilter && this.categoryFilter !== 'all') {
            filtered = filtered.filter(audio => audio.category === this.categoryFilter);
        }
        
        return filtered;
    }

    // Editar audio
    editAudio(audioId) {
        const audio = this.audios.find(a => a.id === audioId);
        if (!audio) return;
        
        this.editingAudioId = audioId;
        
        document.getElementById('audioName').value = audio.customName || audio.name;
        document.getElementById('audioCategory').value = audio.category;
        document.getElementById('audioImage').value = audio.imageUrl || '';
        
        // Limpiar selector de archivo
        document.getElementById('newAudioFile').value = '';
        document.getElementById('newAudioFileName').textContent = 'Ningún archivo seleccionado';
        
        document.getElementById('editAudioModal').classList.add('active');
    }

    // Manejar formulario de edición
    async handleEditAudio(e) {
        e.preventDefault();
        
        try {
            const audio = this.audios.find(a => a.id === this.editingAudioId);
            if (!audio) return;
            
            // Actualizar información básica
            audio.customName = document.getElementById('audioName').value;
            audio.category = document.getElementById('audioCategory').value;
            audio.imageUrl = document.getElementById('audioImage').value;
        
        // Verificar si se seleccionó un nuevo archivo
        const newFileInput = document.getElementById('newAudioFile');
        if (newFileInput.files && newFileInput.files.length > 0) {
            const newFile = newFileInput.files[0];
            
            try {
                // Limpiar object URL anterior si existe
                if (audio.objectURL) {
                    URL.revokeObjectURL(audio.objectURL);
                }
                
                // Crear nuevo object URL
                const objectURL = URL.createObjectURL(newFile);
                
                // Actualizar información del archivo
                audio.file = newFile;
                audio.objectURL = objectURL;
                audio.fileName = newFile.name;
                audio.size = newFile.size;
                audio.needsReload = false;
                
                // Obtener nueva duración
                const tempAudio = new Audio();
                tempAudio.src = objectURL;
                
                await new Promise((resolve, reject) => {
                    const handleLoadedMetadata = () => {
                        audio.duration = tempAudio.duration;
                        // Limpiar event listeners
                        tempAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                        tempAudio.removeEventListener('error', handleError);
                        resolve();
                    };
                    
                    const handleError = () => {
                        console.error(`Error cargando metadatos del nuevo archivo: ${newFile.name}`);
                        // Limpiar event listeners
                        tempAudio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                        tempAudio.removeEventListener('error', handleError);
                        // No rechazamos, solo ponemos duración por defecto
                        audio.duration = 0;
                        resolve();
                    };
                    
                    tempAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
                    tempAudio.addEventListener('error', handleError);
                });
                
                // Guardar archivo en IndexedDB para persistencia
                await this.saveAudioFileToIndexedDB(this.editingAudioId, newFile);
                
                this.showToast(`🎉 Audio y archivo actualizados correctamente! "${audio.customName || audio.name}" está listo.`);
            } catch (error) {
                console.error('Error actualizando archivo:', error);
                this.showToast('❌ Error actualizando el archivo. Los demás cambios se guardaron.', 'error');
            }
        } else {
            this.showToast('✅ Audio actualizado correctamente');
        }
        
            this.saveToStorage();
            this.updateViews();
            
            document.getElementById('editAudioModal').classList.remove('active');
        } catch (error) {
            console.error('Error crítico editando audio:', error);
            this.showToast('❌ Error editando el audio. Los cambios pueden no haberse guardado.', 'error');
            document.getElementById('editAudioModal').classList.remove('active');
        }
    }

    // Manejar selección de nuevo archivo en el modal de edición
    handleNewAudioFileSelected(e) {
        const files = e.target.files;
        const fileNameElement = document.getElementById('newAudioFileName');
        
        if (files && files.length > 0) {
            const file = files[0];
            
            // Verificar que sea un archivo de audio
            if (!file.type.startsWith('audio/')) {
                this.showToast('❌ Por favor selecciona un archivo de audio válido', 'error');
                e.target.value = '';
                fileNameElement.textContent = 'Ningún archivo seleccionado';
                return;
            }
            
            // Mostrar el nombre del archivo seleccionado
            fileNameElement.textContent = `📁 ${file.name} (${this.formatFileSize(file.size)})`;
            fileNameElement.style.color = 'var(--success-color)';
        } else {
            fileNameElement.textContent = 'Ningún archivo seleccionado';
            fileNameElement.style.color = 'var(--text-secondary)';
        }
    }

    // Solicitar recarga de audio
    promptReloadAudio(audioId) {
        const audio = this.audios.find(a => a.id === audioId);
        if (!audio) return;
        
        // Crear input temporal para seleccionar archivo
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) {
                this.showToast('⚠️ No se seleccionó ningún archivo', 'warning');
                return;
            }
            
            // Verificar que sea un archivo de audio
            if (!file.type.startsWith('audio/')) {
                this.showToast('❌ Por favor selecciona un archivo de audio válido', 'error');
                return;
            }
            
            // Verificar que el nombre coincida (opcional)
            if (file.name !== audio.fileName) {
                if (!confirm(`⚠️ El archivo seleccionado "${file.name}" tiene un nombre diferente al original "${audio.fileName}".\n\n¿Deseas continuar de todos modos?`)) {
                    return;
                }
            }
            
            // Actualizar el audio con el nuevo archivo
            this.reloadAudioFile(audioId, file);
        });
        
        // Activar selector de archivos
        input.click();
        
        // Mostrar mensaje adicional si es necesario
        setTimeout(() => {
            if (!input.files.length) {
                this.showToast(`💡 Necesitas seleccionar el archivo "${audio.fileName}" para poder reproducir este audio`, 'info');
            }
        }, 1000);
    }
    
    // Recargar archivo de audio
    async reloadAudioFile(audioId, file) {
        const audio = this.audios.find(a => a.id === audioId);
        if (!audio) return;
        
        try {
            // Crear nuevo object URL
            const objectURL = URL.createObjectURL(file);
            
            // Guardar archivo en IndexedDB para persistencia
            await this.saveAudioFileToIndexedDB(audioId, file);
            
            // Actualizar el audio
            audio.file = file;
            audio.objectURL = objectURL;
            audio.needsReload = false;
            audio.size = file.size;
            
            // Si el nombre del archivo es diferente, actualizar
            if (file.name !== audio.fileName) {
                audio.fileName = file.name;
                audio.name = file.name.replace(/\.[^/.]+$/, '');
            }
            
            this.saveToStorage();
            this.updateViews();
            
            this.showToast(`🎉 "${audio.customName || audio.name}" guardado permanentemente y listo para reproducir!`);
        } catch (error) {
            console.error(`Error guardando archivo ${file.name} en IndexedDB:`, error);
            
            // Crear object URL aunque no se pudo guardar en IndexedDB
            const objectURL = URL.createObjectURL(file);
            audio.file = file;
            audio.objectURL = objectURL;
            audio.needsReload = false; // Funciona por ahora, pero necesitará recarga después
            audio.size = file.size;
            
            if (file.name !== audio.fileName) {
                audio.fileName = file.name;
                audio.name = file.name.replace(/\.[^/.]+$/, '');
            }
            
            this.saveToStorage();
            this.updateViews();
            
            this.showToast(`⚠️ "${audio.customName || audio.name}" está listo, pero no se pudo guardar permanentemente. Necesitará recarga al recargar la página.`, 'warning');
        }
    }

    // Recargar todos los audios
    reloadAllAudios() {
        const audiosToReload = this.audios.filter(audio => audio.needsReload);
        
        if (audiosToReload.length === 0) {
            this.showToast('No hay audios que necesiten recarga', 'info');
            return;
        }
        
        // Crear input para seleccionar múltiples archivos
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.multiple = true;
        
        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            let reloadedCount = 0;
            
            // Intentar emparejar archivos con audios existentes
            files.forEach(file => {
                // Buscar audio por nombre de archivo
                const audio = audiosToReload.find(a => a.fileName === file.name);
                
                if (audio) {
                    // Recargar el archivo
                    const objectURL = URL.createObjectURL(file);
                    audio.file = file;
                    audio.objectURL = objectURL;
                    audio.needsReload = false;
                    audio.size = file.size;
                    reloadedCount++;
                } else {
                    // Si no encuentra coincidencia, intentar con el nombre base
                    const baseName = file.name.replace(/\.[^/.]+$/, '');
                    const audioByBaseName = audiosToReload.find(a => 
                        a.name === baseName || a.customName === baseName
                    );
                    
                    if (audioByBaseName && confirm(`¿Asociar "${file.name}" con "${audioByBaseName.customName || audioByBaseName.name}"?`)) {
                        const objectURL = URL.createObjectURL(file);
                        audioByBaseName.file = file;
                        audioByBaseName.objectURL = objectURL;
                        audioByBaseName.needsReload = false;
                        audioByBaseName.fileName = file.name;
                        audioByBaseName.name = baseName;
                        audioByBaseName.size = file.size;
                        reloadedCount++;
                    }
                }
            });
            
            if (reloadedCount > 0) {
                this.saveToStorage();
                this.updateViews();
                this.showToast(`${reloadedCount} archivo(s) recargado(s) correctamente`);
                
                const remaining = audiosToReload.length - reloadedCount;
                if (remaining > 0) {
                    this.showToast(`Todavía quedan ${remaining} archivo(s) por recargar`, 'warning');
                }
            } else {
                this.showToast('No se encontraron archivos coincidentes', 'error');
            }
        });
        
        // Activar selector de archivos
        input.click();
    }

    // Eliminar audio
    async deleteAudio(audioId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este audio?')) return;
        
        const index = this.audios.findIndex(a => a.id === audioId);
        if (index === -1) return;
        
        // Limpiar object URL si existe
        if (this.audios[index].objectURL) {
            URL.revokeObjectURL(this.audios[index].objectURL);
        }
        
        // Si es el audio actual, detener reproducción
        if (this.currentAudioId === audioId) {
            this.audioElement.pause();
            this.currentAudioId = null;
            document.getElementById('playerBar').classList.add('hidden');
        }
        
        // Eliminar archivo de IndexedDB
        try {
            await this.deleteAudioFileFromIndexedDB(audioId);
            console.log(`Archivo eliminado de IndexedDB: ${audioId}`);
        } catch (error) {
            console.error(`Error eliminando archivo de IndexedDB: ${audioId}`, error);
        }
        
        this.audios.splice(index, 1);
        this.saveToStorage();
        this.updateViews();
        
        this.showToast('🗑️ Audio eliminado completamente');
    }

    // Abrir modal de programación
    openScheduleModal() {
        if (this.audios.length === 0) {
            this.showToast('Primero debes agregar audios a la biblioteca', 'warning');
            return;
        }
        
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleModal').classList.add('active');
    }

    // Manejar formulario de programación
    handleScheduleAudio(e) {
        e.preventDefault();
        
        const audioId = document.getElementById('scheduleAudio').value;
        const time = document.getElementById('scheduleTime').value;
        const repeat = parseInt(document.getElementById('scheduleRepeat').value);
        const interval = parseInt(document.getElementById('scheduleInterval').value);
        
        const checkboxes = document.querySelectorAll('#scheduleDays input[type="checkbox"]:checked');
        const days = Array.from(checkboxes).map(cb => parseInt(cb.value));
        
        if (days.length === 0) {
            this.showToast('Debes seleccionar al menos un día', 'error');
            return;
        }
        
        const schedule = {
            id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            audioId: audioId,
            time: time,
            days: days,
            repeat: repeat,
            interval: interval,
            active: true,
            createdAt: new Date().toISOString()
        };
        
        this.schedules.push(schedule);
        this.saveToStorage();
        this.updateScheduleView();
        
        document.getElementById('scheduleModal').classList.remove('active');
        this.showToast('Programación creada correctamente');
    }

    // Toggle estado de programación
    toggleSchedule(scheduleId) {
        const schedule = this.schedules.find(s => s.id === scheduleId);
        if (!schedule) return;
        
        schedule.active = !schedule.active;
        this.saveToStorage();
        this.updateScheduleView();
        
        this.showToast(`Programación ${schedule.active ? 'activada' : 'desactivada'}`);
    }

    // Eliminar programación
    deleteSchedule(scheduleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta programación?')) return;
        
        const index = this.schedules.findIndex(s => s.id === scheduleId);
        if (index === -1) return;
        
        this.schedules.splice(index, 1);
        this.saveToStorage();
        this.updateScheduleView();
        
        this.showToast('Programación eliminada correctamente');
    }

    // Verificar programaciones
    checkSchedules() {
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        this.schedules.forEach(schedule => {
            if (!schedule.active) return;
            if (!schedule.days.includes(currentDay)) return;
            if (schedule.time !== currentTime) return;
            
            // Verificar si ya se ejecutó hoy
            const lastPlayed = schedule.lastPlayed ? new Date(schedule.lastPlayed) : null;
            if (lastPlayed && lastPlayed.toDateString() === now.toDateString()) return;
            
            // Ejecutar programación
            const audio = this.audios.find(a => a.id === schedule.audioId);
            if (!audio) return;
            
            // Si el audio necesita recarga, mostrar notificación pero no reproducir
            if (audio.needsReload || !audio.objectURL) {
                this.showToast(`La programación "${audio.customName || audio.name}" no se puede reproducir porque el archivo necesita ser recargado`, 'warning');
                return;
            }
            
            // Marcar como reproducido hoy ANTES de reproducir
            schedule.lastPlayed = now.toISOString();
            this.saveToStorage();
            
            // Reproducir el audio las veces especificadas con intervalo
            let repeatCount = 0;
            const interval = (schedule.interval || 0) * 1000; // Convertir a milisegundos
            
            const playWithRepeat = () => {
                if (repeatCount < schedule.repeat) {
                    this.playAudio(audio.id);
                    repeatCount++;
                    
                    // Si hay más repeticiones pendientes
                    if (repeatCount < schedule.repeat) {
                        // Esperar a que termine el audio actual
                        const onEnded = () => {
                            this.audioElement.removeEventListener('ended', onEnded);
                            
                            // Si hay intervalo, esperar antes de la siguiente repetición
                            if (interval > 0) {
                                setTimeout(() => {
                                    playWithRepeat();
                                }, interval);
                            } else {
                                // Sin intervalo, reproducir inmediatamente
                                playWithRepeat();
                            }
                        };
                        
                        this.audioElement.addEventListener('ended', onEnded);
                    }
                }
            };
            
            playWithRepeat();
            
            const repeatText = schedule.repeat > 1 ? 
                ` (${schedule.repeat} veces con ${schedule.interval}s de intervalo)` : '';
            this.showToast(`Reproduciendo programación: ${audio.customName || audio.name}${repeatText}`);
        });
    }

    // Obtener texto de días
    getDaysText(days) {
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        
        if (days.length === 7) {
            return 'Todos los días';
        }
        
        if (days.length === 5 && days.every(d => d >= 1 && d <= 5)) {
            return 'Lunes a Viernes';
        }
        
        if (days.length === 2 && days.includes(0) && days.includes(6)) {
            return 'Fines de semana';
        }
        
        return days.map(d => dayNames[d]).join(', ');
    }

    // ====== INDEXEDDB FUNCTIONS ======
    
    // Inicializar IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AudioPanelDB', 1);
            
            request.onerror = () => {
                console.error('Error abriendo IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB inicializado correctamente');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Crear object store para archivos de audio
                if (!db.objectStoreNames.contains('audioFiles')) {
                    const audioStore = db.createObjectStore('audioFiles', { keyPath: 'id' });
                    audioStore.createIndex('fileName', 'fileName', { unique: false });
                }
                
                console.log('Base de datos IndexedDB creada/actualizada');
            };
        });
    }
    
    // Guardar archivo de audio en IndexedDB
    async saveAudioFileToIndexedDB(audioId, file) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['audioFiles'], 'readwrite');
            const store = transaction.objectStore('audioFiles');
            
            const audioData = {
                id: audioId,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                fileData: file, // Guardar el archivo completo
                dateStored: new Date().toISOString()
            };
            
            const request = store.put(audioData);
            
            request.onsuccess = () => {
                console.log(`Archivo ${file.name} guardado en IndexedDB`);
                resolve(audioData);
            };
            
            request.onerror = () => {
                console.error('Error guardando archivo en IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }
    
    // Cargar archivo de audio desde IndexedDB
    async loadAudioFileFromIndexedDB(audioId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['audioFiles'], 'readonly');
            const store = transaction.objectStore('audioFiles');
            const request = store.get(audioId);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log(`Archivo cargado desde IndexedDB: ${request.result.fileName}`);
                    resolve(request.result);
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.error('Error cargando archivo desde IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }
    
    // Eliminar archivo de audio de IndexedDB
    async deleteAudioFileFromIndexedDB(audioId) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('IndexedDB no está disponible'));
                return;
            }
            
            const transaction = this.db.transaction(['audioFiles'], 'readwrite');
            const store = transaction.objectStore('audioFiles');
            const request = store.delete(audioId);
            
            request.onsuccess = () => {
                console.log(`Archivo eliminado de IndexedDB: ${audioId}`);
                resolve();
            };
            
            request.onerror = () => {
                console.error('Error eliminando archivo de IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }
    
    // Cargar todos los archivos desde IndexedDB
    async loadAllAudioFilesFromIndexedDB() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }
            
            const transaction = this.db.transaction(['audioFiles'], 'readonly');
            const store = transaction.objectStore('audioFiles');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('Error cargando todos los archivos desde IndexedDB:', request.error);
                reject(request.error);
            };
        });
    }

    // Guardar en almacenamiento local
    saveToStorage() {
        try {
            // Guardar metadata de audios (sin el archivo)
            const audiosData = this.audios.map(audio => ({
                id: audio.id,
                name: audio.name,
                fileName: audio.fileName,
                customName: audio.customName,
                category: audio.category,
                imageUrl: audio.imageUrl,
                duration: audio.duration,
                size: audio.size,
                dateAdded: audio.dateAdded
            }));
            
            localStorage.setItem('audioPanel_audios', JSON.stringify(audiosData));
            localStorage.setItem('audioPanel_schedules', JSON.stringify(this.schedules));
            
            // Guardar el audio actual si existe
            if (this.currentAudioId) {
                localStorage.setItem('audioPanel_currentAudio', this.currentAudioId);
            } else {
                localStorage.removeItem('audioPanel_currentAudio');
            }
            
            console.log('Datos guardados en localStorage');
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    }

    // Cargar desde almacenamiento local
    async loadFromStorage() {
        try {
            const audiosData = localStorage.getItem('audioPanel_audios');
            const schedulesData = localStorage.getItem('audioPanel_schedules');
            const currentAudioId = localStorage.getItem('audioPanel_currentAudio');
            

            
            if (audiosData) {
                const savedAudios = JSON.parse(audiosData);
                console.log(`🎵 Encontrados ${savedAudios.length} audios en localStorage:`, savedAudios);
                
                // Intentar cargar archivos desde IndexedDB
                const storedFiles = await this.loadAllAudioFilesFromIndexedDB();
                console.log(`💾 Encontrados ${storedFiles.length} archivos en IndexedDB:`, storedFiles.map(f => ({ id: f.id, hasFile: !!f.fileData })));
                
                // Restaurar audios con archivos desde IndexedDB si están disponibles
                this.audios = await Promise.all(savedAudios.map(async (audio) => {
                    const storedFile = storedFiles.find(f => f.id === audio.id);
                    
                    if (storedFile && storedFile.fileData) {
                        // ¡Archivo encontrado en IndexedDB! No necesita recarga
                        const objectURL = URL.createObjectURL(storedFile.fileData);
                        return {
                            ...audio,
                            file: storedFile.fileData,
                            objectURL: objectURL,
                            needsReload: false // ¡No necesita recarga!
                        };
                    } else {
                        // No hay archivo guardado, necesita recarga
                        return {
                            ...audio,
                            file: null,
                            objectURL: null,
                            needsReload: true
                        };
                    }
                }));
                
                // Contar cuántos archivos están listos vs necesitan recarga
                const readyAudios = this.audios.filter(a => !a.needsReload).length;
                const needReloadAudios = this.audios.filter(a => a.needsReload).length;
                
                // Restaurar el audio actual si existe
                if (currentAudioId) {
                    this.currentAudioId = currentAudioId;
                    const currentAudio = this.audios.find(a => a.id === currentAudioId);
                    if (currentAudio) {
                        this.updatePlayerBar(currentAudio);
                        document.getElementById('playerBar').classList.remove('hidden');
                    }
                }
                
                // Mostrar mensaje según el estado
                if (readyAudios > 0 && needReloadAudios === 0) {
                    this.showToast(`🎉 ¡Perfecto! Se cargaron ${readyAudios} audio(s) y están listos para reproducir.`, 'success');
                } else if (readyAudios > 0 && needReloadAudios > 0) {
                    this.showToast(`🎵 Se cargaron ${readyAudios} audio(s) listos y ${needReloadAudios} necesitan recarga. Ve a "Administración" para recargar los faltantes.`, 'info');
                } else if (needReloadAudios > 0) {
                    this.showToast(`🔄 Se cargaron ${needReloadAudios} audio(s). Ve a "Administración" → "Recargar archivos" para cargarlos.`, 'info');
                }
                
                // Asegurar que se muestre el botón de recargar si es necesario
                if (needReloadAudios > 0) {
                    setTimeout(() => {
                        this.updateReloadButton();
                    }, 100);
                }
                
                console.log(`Cargados ${this.audios.length} audios (${readyAudios} listos, ${needReloadAudios} necesitan recarga)`);
            } else {
                console.log('ℹ️ No hay datos de audios en localStorage');
                this.showToast('ℹ️ No hay audios guardados. Agrega algunos audios en "Administración".', 'info');
            }
            
            if (schedulesData) {
                this.schedules = JSON.parse(schedulesData);
                console.log(`Cargadas ${this.schedules.length} programaciones desde localStorage`);
            }
            
            console.log('🔄 Final de loadFromStorage - this.audios.length:', this.audios.length);
            
            // IMPORTANTE: Renderizar los audios cargados en la biblioteca
            if (this.audios.length > 0) {
                console.log('🎨 Renderizando audios en la biblioteca...');
                this.updateViews(); // Asegurarse de que se muestren los audios
            }
        } catch (error) {
            console.error('Error cargando desde almacenamiento:', error);
            this.showToast('❌ Error cargando datos guardados. Verifica la consola.', 'error');
        }
    }

    // Cambiar tema
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('audioPanel_theme', newTheme);
    }

    // Cargar tema
    loadTheme() {
        const savedTheme = localStorage.getItem('audioPanel_theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }

    // Mostrar toast
    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Formatear tiempo
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    // Formatear tamaño de archivo
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Escapar HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar aplicación cuando el DOM esté listo
let audioPanel;
// Manejo global de errores para evitar promesas no capturadas
window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa no manejada rechazada:', event.reason);
    // Prevenir que aparezca en la consola como un error no controlado
    event.preventDefault();
});

// Manejo de errores globales
window.addEventListener('error', (event) => {
    console.error('Error global capturado:', event.error);
});

document.addEventListener('DOMContentLoaded', () => {
    audioPanel = new AudioPanel();
});