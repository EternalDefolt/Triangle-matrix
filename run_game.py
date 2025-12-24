import http.server
import socketserver
import webbrowser
import os
import time

PORT = 8000
DIRECTORY = "."

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def open_browser():
    time.sleep(1) # Ждем секунду, пока сервер запустится
    url = f"http://localhost:{PORT}/html/index.html"
    print(f"Открываем игру по адресу: {url}")
    webbrowser.open(url)

if __name__ == "__main__":
    # Переходим в директорию скрипта, чтобы пути работали корректно
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Создаем сервер
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Сервер запущен на порту {PORT}")
        print("Нажмите Ctrl+C для выхода")
        
        # Запускаем браузер в отдельном потоке или просто перед запуском сервера (тут проще перед, если без потоков, но serve_forever блокирует)
        # Лучше использовать threading для таймера или просто открыть перед запуском, надеясь что сервер быстро встанет.
        # Но http.server запускается мгновенно.
        
        from threading import Thread
        thread = Thread(target=open_browser)
        thread.start()
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер остановлен.")
