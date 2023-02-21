import * as net from 'net';
import { SocketHandler } from './socket_handler'

const port: number = 18018;

interface Connection {
    ip_address: string;
    socket_handler: SocketHandler;
}

export class Node {

    _longest_chain: string = '0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2'
    _chain_length: number = 1
    _connections: Connection[] = []

    connect(ip_address: string) {

        const client = new net.Socket();
        const remote_ip = `${ip_address}:${port}`

        const socket_handler = new SocketHandler(client, remote_ip);

        this._bind_event_listener(socket_handler);

        socket_handler.connect(ip_address, port).then(() => {
            this._connections.push({ ip_address: remote_ip, socket_handler });
            let object_message: any = {
                "type": "getobject",
                "objectid": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
            };

            socket_handler._write(object_message);
        })

    }

    listen() {

        const server = new net.Server();
        server.listen(port, function () {
            console.log('Server listening for connections');
        });

        server.on('connection', (socket: net.Socket) => {

            const remote_ip: string = `${socket.remoteAddress}:${socket.remotePort}`
            const socket_handler = new SocketHandler(socket, remote_ip);
            this._bind_event_listener(socket_handler);
            socket_handler.do_handshake();

            this._connections.push({ ip_address: remote_ip, socket_handler });
            for (const connection of this._connections) {
                console.log(connection.ip_address);
            }

        });

    }

    _bind_event_listener(socket_handler: SocketHandler) {

        socket_handler._event_emitter.on("newPeer", async (peer: string) => {

            try {

                const ip_address_components = peer.split(":");
                const host: string = ip_address_components[0];
                const port: number = parseInt(ip_address_components[1]);

                const client = new net.Socket();

                const socket_handler = new SocketHandler(client, peer);
                const succesful_connection = await socket_handler.connect(host, port);

                if (succesful_connection) {
                    this._connections.push({ ip_address: peer, socket_handler })
                    this._bind_event_listener(socket_handler);
                }

            } catch (err) {
                console.error(err);
            }
        })

        socket_handler._event_emitter.on("broadcast", (object_id: string) => {
            const broadcast_message: any = {
                "type": "ihaveobject",
                "objectid": object_id,
            }
            for (const connection of this._connections) {
                const socket_handler = connection.socket_handler;
                socket_handler._write(broadcast_message);
            }
        })

        socket_handler._event_emitter.on("unknownObjects", (unknown_tx_ids: string[]) => {
            for (const unknown_tx_id of unknown_tx_ids) {
                const broadcast_message: any = {
                    "type": "getobject",
                    "objectid": unknown_tx_id,
                }
                for (const connection of this._connections) {
                    const socket_handler = connection.socket_handler;
                    socket_handler._write(broadcast_message);
                }
            }
        })

        socket_handler._event_emitter.on("updateChain", (chain: [string, number]) => {
            const chaintip: string = chain[0];
            const chain_length: number = chain[1];
            if (chain_length > this._chain_length) {
                this._chain_length = chain_length;
                this._longest_chain = chaintip;
            }
        })

        socket_handler._event_emitter.on("chaintipRequest", () => {
            const json_message = {
                "type": "chaintip",
                "blockid": this._longest_chain,
            };
            socket_handler._write(json_message);
        })

        socket_handler._socket.on('close', () => {
            for (let i = 0; i < this._connections.length; i++) {
                if (this._connections[i].ip_address == socket_handler._remote_ip) {
                    this._connections.splice(i, 1);
                    i--;
                }
            }
        })

    }
}
