import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8000
DIRECTORY = "ui"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    # Verify directory exists
    if not os.path.exists(DIRECTORY):
        print(f"Error: Directory '{DIRECTORY}' not found.")
        sys.exit(1)
        
    # Reconfigure stdout/stderr to UTF-8 to handle emojis in Windows console
    if sys.stdout and sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass
            
    # Start server
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print("🚀 Agent UI Server Started!")
            print(f"🔗 Open your browser at: {url}")
            print("Press Ctrl+C to stop the server.")
            
            # Try to automatically open in default web browser
            try:
                webbrowser.open(url)
            except Exception:
                pass
                
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98 or e.errno == 10048:
            print(f"Error: Port {PORT} is already in use. Try running on another port or closing the existing process.")
        else:
            print(f"Error: {e}")
            
if __name__ == "__main__":
    main()
