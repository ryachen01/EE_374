import * as net from 'net';
import { SocketHandler } from './socket_handler'

const port: number = 18018;

export class Node {

    handshake_completed: Boolean = false;
    buffer: string = '';

    connect(ip_address: string) {

        const client = new net.Socket();
        const socket_handler = new SocketHandler(client);
        socket_handler.connect(ip_address, port);

    }

    listen() {

        const server = new net.Server();
        server.listen(port, function () {
            console.log('Server listening for connections');
        });

        server.on('connection', (socket: net.Socket) => {

            const socket_handler = new SocketHandler(socket);
            socket_handler.do_handshake();

        });

    }
}
