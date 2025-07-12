import sys
import socket

def main(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('0.0.0.0', int(port)))
    s.listen(1)
    try:
        while True:
            conn, _ = s.accept()
            conn.close()
    except KeyboardInterrupt:
        pass

if __name__ == '__main__':
    main(sys.argv[1])
