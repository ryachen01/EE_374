import * as net from 'net';
import { SocketHandler } from './socket_handler'

const port: number = 18018;

export class Node {

    connect(ip_address: string) {

        const client = new net.Socket();
        const remote_ip = `${ip_address}:${port}`

        const socket_handler = new SocketHandler(client, remote_ip);
        socket_handler.connect(ip_address, port);

    }

    listen() {

        const server = new net.Server();
        server.listen(port, function () {
            console.log('Server listening for connections');
        });

        server.on('connection', (socket: net.Socket) => {

            const remote_ip: string = `${socket.remoteAddress}:${socket.remotePort}`
            console.log(remote_ip);
            const socket_handler = new SocketHandler(socket, remote_ip);
            socket_handler.do_handshake();

        });

    }
}
