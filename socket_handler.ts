import * as fs from 'fs';
import * as net from 'net';
import isValidDomain from 'is-valid-domain';
import { canonicalize } from 'json-canonicalize';
import { parse_message } from './message';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';
import peers_json from './peers.json'


export class SocketHandler {

    _socket: net.Socket;
    _remote_ip: string;

    _handshake_completed: Boolean = false;
    _buffer: string = "";
    _timer_id: NodeJS.Timeout | null = null;

    _error_count: number = 0;
    _error_threshold: number = 50;
    _timeout_length: number = 10000;
    _max_buffer_size: number = 1000000;


    constructor(socket: net.Socket, remote_ip: string) {

        this._socket = socket;
        this._remote_ip = remote_ip;

        this._socket.on('data', (data: string) => {
            this._data_handler(data);
        })

        this._socket.on('end', () => {
            console.log(`Closing connection with ${this._remote_ip}`);
            this._socket.destroy();
        });

        this._socket.on('error', (err: string) => {
            console.error(`Error: ${err}`);
        });

        this._socket.on('close', () => {
            console.log(`Connection closed with ${this._remote_ip}`);
            this._socket.destroy();
        })

        this._socket.on('drain', () => { })
        this._socket.on('lookup', () => { })
        this._socket.on('ready', () => { })
        this._socket.on('timeout', () => { })

    };

    _non_fatal_error(err: string) {
        console.error(`Error triggered by ${this._remote_ip}: ${err}`);
        this._error_count++;

        if (this._error_count >= this._error_threshold) {
            this._fatal_error("too many non fatal errors");
        }
    }

    _fatal_error(err: string) {
        console.error(`Fatal error triggered by ${this._remote_ip}: ${err}`);
        this.close_connection();
    }

    connect(ip_address: string, port: number) {
        let connection_timer: any;
        connection_timer = setTimeout(() => {
            this._fatal_error("failed to connect to node");
        }, 5000);

        this._socket.connect(port, ip_address, () => {
            clearTimeout(connection_timer);
            console.log(`Connected to ${this._remote_ip}`);

            this.do_handshake();
        });

        // imediately fails to connect
        this._socket.on('error', (err: string) => {
            clearTimeout(connection_timer);
        });

    }

    do_handshake() {
        this._handle_message(MESSAGE_TYPES.SEND_HELLO);
        this._handle_message(MESSAGE_TYPES.REQUEST_PEERS)
    }

    _check_handshake() {

        if (!this._handshake_completed) {
            const json_message: any =
            {
                "type": "error",
                "name": "INVALID_HANDSHAKE",
                "description": "The peer sent other validly formatted messages before sending a valid hello message."
            };
            this._write(json_message);
            this._fatal_error("invalid handshake");
        }

    }

    _handle_message(message_type: MESSAGE_TYPES | INVALID_TYPES): void {


        let json_message: any = null;

        switch (message_type) {
            case MESSAGE_TYPES.HELLO_RECEIVED:
                this._handshake_completed = true;
                break;
            case MESSAGE_TYPES.SEND_HELLO:
                json_message = {
                    "type": "hello",
                    "version": "0.9.0",
                    "agent": "Marabu-Core Client 0.9",
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.PEERS_REQUEST:
                this._check_handshake();
                const peers_list: string[] = peers_json["peers"];
                json_message = {
                    "type": "peers",
                    "peers": peers_list,
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.PEERS_RECEIVED:
                this._check_handshake();
                break;
            case MESSAGE_TYPES.REQUEST_PEERS:
                json_message = {
                    "type": "getpeers",
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.MEMPOOL_REQUEST:
                this._check_handshake();
                json_message = {
                    "type": "mempool",
                    "txids": [],
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.MEMPOOL_RECEIVED:
                this._check_handshake();
                break;
            case MESSAGE_TYPES.REQUEST_MEMPOOL:
                json_message = {
                    "type": "getmempool",
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.CHAINTIP_REQUEST:
                this._check_handshake();
                json_message = {
                    "type": "chaintip",
                    "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.CHAINTIP_RECEIVED:
                this._check_handshake();
                break;
            case MESSAGE_TYPES.REQUEST_CHAINTIP:
                json_message = {
                    "type": "getchaintip",
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.OBJECT_REQUEST:
                this._check_handshake();
                json_message = {
                    "type": "object",
                    "object": {
                        "T": "00000000abc00000000000000000000000000000000000000000000000000000",
                        "created": 1671062400,
                        "miner": "Marabu",
                        "nonce": "000000000000000000000000000000000000000000000000000000021bea03ed",
                        "note": "The New York Times 2022-12-13: Scientists Achieve Nuclear Fusion Breakthrough With Blast of 192 Lasers",
                        "previd": null,
                        "txids": [],
                        "type": "block"
                    }
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.OBJECT_RECEIVED:
                this._check_handshake();
                break;
            case MESSAGE_TYPES.REQUEST_OBJECT:
                json_message = {
                    "type": "getobject",
                    "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8",
                }
                this._write(json_message);
                break;
            case MESSAGE_TYPES.HAS_OBJECT:
                this._check_handshake();
                break;
            case MESSAGE_TYPES.NO_MESSAGE:
                break;
            case INVALID_TYPES.INVALID_MESSAGE:
                json_message =
                {
                    "type": "error",
                    "name": "INVALID_FORMAT",
                    "description": "The type of the received message is invalid"
                };
                this._write(json_message);
                this._fatal_error("received message with invalid type");
            case INVALID_TYPES.INVALID_FORMAT:
                json_message =
                {
                    "type": "error",
                    "name": "INVALID_FORMAT",
                    "description": "The format of the received message is invalid."
                };
                this._write(json_message);
                this._fatal_error("received invalid format");
                break;
        }
    }

    _check_valid_ip(ip_address: string): Boolean {
        try {
            const ip_address_components: string[] = ip_address.split(":");
            if (ip_address_components.length !== 2) {
                return false;
            }
            const host: string = ip_address_components[0];
            const port: number = parseInt(ip_address_components[1]);

            if (net.isIP(host) == 0) {
                return false;
            }

            if (port < 1 || port > 65535) {
                return false;
            }
            return true;
        } catch (err: any) {
            this._non_fatal_error("failed to parse peer");
            return false;
        }
    }

    _check_valid_dns(dns_address: string): Boolean {
        try {
            const dns_address_components: string[] = dns_address.split(":");
            if (dns_address_components.length !== 2) {
                return false;
            }
            const host: string = dns_address_components[0];
            const port: number = parseInt(dns_address_components[1]);

            if (host == null) {
                return false;
            }

            if (port < 1 || port > 65535) {
                return false;
            }

            return isValidDomain(host);
        } catch (err: any) {
            this._non_fatal_error("failed to parse peer");
            return false;
        }

    }

    _update_json_list(json_path: string, new_json: any): void {

        try {
            fs.writeFileSync(json_path, JSON.stringify(new_json));
        } catch (error) {
            this._non_fatal_error("failed to update file");
        }

    }

    _try_new_peer(host: string, port: number): void {
        const client = new net.Socket();
        const remote_ip = `${host}:${port}`

        const socket_handler = new SocketHandler(client, remote_ip);
        socket_handler.connect(host, port);
    }

    _handle_new_peers(message: string): void {
        try {

            const exisitng_peers: string[] = peers_json["peers"];

            const new_peers_json: any = JSON.parse(message);
            const new_peers_list: string[] = new_peers_json["peers"];

            for (const peer of new_peers_list) {

                if (this._check_valid_ip(peer) || this._check_valid_dns(peer)) {

                    const ip_address_components = peer.split(":");
                    const host: string = ip_address_components[0];
                    const port: number = parseInt(ip_address_components[1]);

                    if (exisitng_peers.indexOf(peer) == -1) {
                        console.log("trying to add new peer: ", peer);

                        exisitng_peers.push(peer);
                        this._update_json_list("./peers.json", peers_json);
                        this._try_new_peer(host, port);
                    }
                } else {
                    console.log("invalid ip: ", peer);
                }
            }

        } catch (err) {
            this._non_fatal_error("failed to read new peers");
        }

    }

    _data_handler(data: string) {

        if (this._socket.destroyed) {
            return;
        }

        console.log('Received: ' + data);

        this._buffer += data.toString();
        if (this._buffer.length >= this._max_buffer_size) {
            this._handle_buffer_overflow();
        }
        let eom = this._buffer.indexOf('\n');
        while (eom != -1) {
            if (this._timer_id) {
                clearTimeout(this._timer_id);
                this._timer_id = null;
            }
            let message: string = this._buffer.substring(0, eom);
            let message_type: MESSAGE_TYPES | INVALID_TYPES = parse_message(message);

            this._handle_message(message_type);

            if (message_type == MESSAGE_TYPES.PEERS_RECEIVED) {
                this._handle_new_peers(message);
            }

            this._buffer = this._buffer.substring(eom + 1)
            eom = this._buffer.indexOf('\n')
        }
        if (this._buffer != '' && !this._timer_id) {
            this._timer_id = setTimeout(this._handle_timeout.bind(this), this._timeout_length);
        }

        return;
    }

    _handle_buffer_overflow() {

        const json_message: any =
        {
            "type": "error",
            "name": "INVALID_FORMAT",
            "description": "Message exceeds maximum length."
        };
        this._write(json_message);
        this._fatal_error("buffer overflow");
    }

    _handle_timeout() {

        const json_message: any =
        {
            "type": "error",
            "name": "INVALID_FORMAT",
            "description": "Took too long to complete message."
        };
        console.log(json_message);
        this._write(json_message);
        this._fatal_error("buffer timeout");

    }

    _write(data: any) {
        if (this._socket.destroyed) {
            return;
        }
        try {
            const canonicalized_message: string = canonicalize(data);
            console.log(`Sent: ${canonicalized_message}\n`)
            this._socket.write(canonicalized_message + '\n');
        } catch (err) {
            console.error(`failed to send: ${data}`)
        }

    }

    close_connection() {

        if (this._timer_id) {
            clearTimeout(this._timer_id);
        }
        if (!this._socket.destroyed) {
            this._socket.destroy();
        }

    }

}