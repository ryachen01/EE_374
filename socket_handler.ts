import * as net from 'net';
import { canonicalize } from 'json-canonicalize';
import { parse_message, prepare_message } from './message';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';

export class SocketHandler {

    _socket: net.Socket;
    _handshake_completed: Boolean = false;
    _buffer: string = "";
    _timer_id: NodeJS.Timeout | null = null;

    _timeout_length: number = 5000;

    constructor(socket: net.Socket) {

        this._socket = socket;

        this._socket.on('data', (data: string) => {
            this._data_handler(data);
        })

        this._socket.on('end', () => {
            console.log('Closing connection');
            this._socket.destroy();
        });

        this._socket.on('error', (err: string) => {
            console.error(`Error: ${err}`);
        });

        this._socket.on('close', () => {
            console.log('Connection closed');
            this._socket.destroy();
        })

        this._socket.on('drain', () => { })
        this._socket.on('lookup', () => { })
        this._socket.on('ready', () => { })
        this._socket.on('timeout', () => { })

    };

    connect(ip_address: string, port: number) {
        this._socket.connect(port, ip_address, () => {
            console.log('Connected');
            this.do_handshake();

        })
    }

    do_handshake() {
        let hello_message: string = prepare_message(MESSAGE_TYPES.SEND_HELLO);
        this._write(hello_message);

        let peers_message: string = prepare_message(MESSAGE_TYPES.REQUEST_PEERS)
        this._write(peers_message);
    }

    prepare_message(message_type: MESSAGE_TYPES | INVALID_TYPES): string {
        let json_message: any = null;

        switch (message_type) {
            case MESSAGE_TYPES.HELLO_RECEIVED:
                this._handshake_completed = true;
                break;
            case MESSAGE_TYPES.SEND_HELLO:
                json_message = {
                    "type": "hello",
                    "version": "0.9.0",
                    "agent": "Marabu-Core Client 0.9"
                }
                break;
            case MESSAGE_TYPES.PEERS_REQUEST:
                json_message = {
                    "type": "peers",
                    "peers": [],
                }
                break;
            case MESSAGE_TYPES.PEERS_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_PEERS:
                json_message = {
                    "type": "getpeers",
                }
                break;
            case MESSAGE_TYPES.MEMPOOL_REQUEST:
                json_message = {
                    "type": "mempool",
                    "txids": [],
                }
                break;
            case MESSAGE_TYPES.MEMPOOL_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_MEMPOOL:
                json_message = {
                    "type": "getmempool",
                }
                break;
            case MESSAGE_TYPES.CHAINTIP_REQUEST:
                json_message = {
                    "type": "chaintip",
                    "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
                }
                break;
            case MESSAGE_TYPES.CHAINTIP_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_CHAINTIP:
                json_message = {
                    "type": "getchaintip",
                }
                break;
            case MESSAGE_TYPES.OBJECT_REQUEST:
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
                break;
            case MESSAGE_TYPES.OBJECT_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_OBJECT:
                json_message = {
                    "type": "getobject",
                    "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8",
                }
                break;
            case MESSAGE_TYPES.HAS_OBJECT:
                break;
            case MESSAGE_TYPES.NO_MESSAGE:
                break;
            case INVALID_TYPES.INVALID_FORMAT:
                json_message =
                {
                    "type": "error",
                    "name": "INVALID_FORMAT",
                    "description": "The format of the received message is invalid."
                };
                break;
            case INVALID_TYPES.INVALID_HANDSHAKE:
                json_message =
                {
                    "type": "error",
                    "name": "INVALID_FORMAT",
                    "description": "The peer sent other validly formatted messages before sending a valid hello message."
                };
                break;
        }

        if (!json_message) {
            return '';
        }

        let canonicalized_output: string = canonicalize(json_message);
        return canonicalized_output;
    }

    _data_handler(data: string) {
        console.log('Received: ' + data);

        this._buffer += data.toString();
        let eom = this._buffer.indexOf('\n');
        while (eom != -1) {
            if (this._timer_id) {
                clearTimeout(this._timer_id);
                this._timer_id = null;
            }
            let message: string = this._buffer.substring(0, eom);
            let message_type: MESSAGE_TYPES | INVALID_TYPES = parse_message(message);

            let message_to_send: string = this.prepare_message(message_type);

            if (message_type in MESSAGE_TYPES && !this._handshake_completed) {
                message_to_send = this.prepare_message(INVALID_TYPES.INVALID_HANDSHAKE);
            }

            if (message_to_send != '') {
                this._write(message_to_send);
            }

            this._buffer = this._buffer.substring(eom + 1)
            eom = this._buffer.indexOf('\n')
        }
        if (this._buffer != '') {
            this._timer_id = setTimeout(this._handle_timeout, this._timeout_length);
        }

        return;
    }

    _handle_timeout() {
        this._socket.destroy();
    }

    _write(data: string) {

        try {
            console.log(`Sent: ${data}\n`)
            this._socket.write(data + '\n');
        } catch (err) {
            console.error(`failed to send: ${data}`)
        }

    }

}