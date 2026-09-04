import http.server
import socketserver
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    daemon_threads = True
    allow_reuse_address = True

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable caching during dev
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    Handler.extensions_map.update({
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json'
    })

    try:
        with ThreadedTCPServer(("", PORT), Handler) as httpd:
            print(f"==================================================")
            print(f" Blade Tiers Server is running at:")
            print(f" http://localhost:{PORT}")
            print(f" http://127.0.0.1:{PORT}")
            print(f"==================================================")
            sys.stdout.flush()
            httpd.serve_forever()
    except OSError as e:
        print(f"Could not bind to port {PORT}: {e}")
        ALT_PORT = 8081
        with ThreadedTCPServer(("", ALT_PORT), Handler) as httpd:
            print(f"Running on alternate port: http://localhost:{ALT_PORT}")
            sys.stdout.flush()
            httpd.serve_forever()
