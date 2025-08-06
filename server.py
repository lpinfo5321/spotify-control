#!/usr/bin/env python3
"""
Servidor HTTP simple con headers de permisos configurados para Spotify integration
"""

import http.server
import socketserver
import sys
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Agregar headers para evitar errores de políticas de permisos
        self.send_header('Permissions-Policy', 'unload=*, microphone=*, camera=*, autoplay=*')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        
        # CSP MÁS PERMISIVO para Spotify
        csp = ("default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https: http:; "
               "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.scdn.co https://accounts.spotify.com; "
               "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
               "font-src 'self' https://fonts.gstatic.com; "
               "img-src 'self' data: https: http:; "
               "frame-src 'self' https://accounts.spotify.com https://sdk.scdn.co; "
               "connect-src 'self' https://accounts.spotify.com https://api.spotify.com https://sdk.scdn.co")
        self.send_header('Content-Security-Policy', csp)
        
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

def run_server(port=8000):
    """Ejecutar servidor HTTP con configuración personalizada"""
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 Servidor iniciado en http://127.0.0.1:{port}")
            print(f"🎵 Configurado para Spotify integration")
            print(f"📱 Accede a: http://127.0.0.1:{port}")
            print("🛑 Presiona Ctrl+C para detener")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido")
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Error: Puerto {port} ya está en uso")
            print(f"💡 Intenta con otro puerto: python server.py {port+1}")
        else:
            print(f"❌ Error iniciando servidor: {e}")

if __name__ == "__main__":
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Puerto inválido, usando puerto 8000")
            port = 8000
    
    run_server(port)