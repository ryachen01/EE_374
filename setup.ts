import * as net from 'net';
import { canonicalize } from 'json-canonicalize';

const port: number = 18018;


enum MESSAGE_TYPES {
    HELLO_RECEIVED = 0,
    SEND_HELLO = 1,
    PEERS_REQUEST = 2,
    PEERS_RECEIVED = 3,
    REQUEST_PEERS = 4,
    CHAINTIP_REQUEST = 5,
    CHAINTIP_RECEIVED = 6,
    REQUEST_CHAINTIP = 7,
    MEMPOOL_REQUEST = 8,
    MEMPOOL_RECEIVED = 9,
    REQUEST_MEMPOOL = 10,
    OBJECT_REQUEST = 11,
    OBJECT_RECEIVED = 12,
    REQUEST_OBJECT = 13,
    HAS_OBJECT = 14,
    NO_MESSAGE = 15,
}

enum INVALID_TYPES {
    INVALID_FORMAT = 16,
    INTERNAL_ERROR = 17,
    UNKNOWN_OBJECT = 18,
    UNFINDABLE_OBJECT = 19,
    INVALID_HANDSHAKE = 20,
    INVALID_TX_OUTPOINT = 21,
    INVALID_TX_SIGNATURE = 22,
    INVALID_TX_CONSERVATION = 23,
    INVALID_BLOCK_COINBASE = 24,
    INVALID_BLOCK_TIMESTAMP = 25,
    INVALID_BLOCK_POW = 26,
    INVALID_GENESIS = 27,
}

export class Server {

    handshake_completed: Boolean = false;

    parse_message(received_message: string): MESSAGE_TYPES | INVALID_TYPES {

        let result: MESSAGE_TYPES | INVALID_TYPES;

        try {

            let parsed_json = JSON.parse(received_message);
            switch (parsed_json["type"]) {
                case "hello":
                    result = (MESSAGE_TYPES.HELLO_RECEIVED);
                    break;
                case "getpeers":
                    result = (MESSAGE_TYPES.PEERS_REQUEST);
                    break;
                case "getchaintip":
                    result = (MESSAGE_TYPES.CHAINTIP_REQUEST);
                    break;
                case "getmempool":
                    result = (MESSAGE_TYPES.MEMPOOL_REQUEST);
                    break;
                case "getobject":
                    result = (MESSAGE_TYPES.OBJECT_REQUEST);
                    break;
                case "peers":
                    result = (MESSAGE_TYPES.PEERS_RECEIVED);
                    break;
                case "chaintip":
                    result = (MESSAGE_TYPES.CHAINTIP_RECEIVED);
                    break;
                case "mempool":
                    result = (MESSAGE_TYPES.MEMPOOL_RECEIVED);
                    break;
                case "object":
                    result = (MESSAGE_TYPES.OBJECT_RECEIVED);
                    break;
                case "ihaveobject":
                    result = (MESSAGE_TYPES.HAS_OBJECT);
                    break;
                case "error":
                    result = (MESSAGE_TYPES.NO_MESSAGE);
                    break;
                default:
                    result = (INVALID_TYPES.INTERNAL_ERROR);
                    break;
            }
        } catch (err) {
            result = INVALID_TYPES.INVALID_FORMAT;
        }

        return result;

    }

    prepare_message(message_type: MESSAGE_TYPES | INVALID_TYPES): string {
        let json_message: any;

        switch (message_type) {
            case MESSAGE_TYPES.HELLO_RECEIVED:
                this.handshake_completed = true;
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

        let canonicalized_output: string = canonicalize(json_message);
        return canonicalized_output;
    }

    connect() {
        const client = new net.Socket();

        let buffer: string = '';

        client.connect(port, '45.63.84.226', () => {
            console.log('Connected');

            let hello_message: string = this.prepare_message(MESSAGE_TYPES.SEND_HELLO);
            client.write(hello_message + '\n');
            let peers_message: string = this.prepare_message(MESSAGE_TYPES.REQUEST_PEERS)
            client.write(peers_message + '\n');

            let message_to_send = this.prepare_message(INVALID_TYPES.INVALID_FORMAT);
            client.write(message_to_send + '\n');
        });

        client.on('data', (data: string) => {

            console.log(`Received: ${data.toString()}`)

            buffer += data.toString();
            let eom = buffer.indexOf('\n');
            while (eom != -1) {
                let message: string = buffer.substring(0, eom);
                let message_type: MESSAGE_TYPES | INVALID_TYPES = this.parse_message(message);
                let message_to_send: string = this.prepare_message(message_type);

                if (message_type in MESSAGE_TYPES && !this.handshake_completed) {
                    message_to_send = this.prepare_message(INVALID_TYPES.INVALID_HANDSHAKE);
                }

                if (message_to_send != 'undefined') {
                    console.log(`Sent: ${message_to_send}\n`)
                    client.write(message_to_send + '\n');
                }
                buffer = buffer.substring(eom + 1)
                eom = buffer.indexOf('\n')
            }
        });

        client.on('error', (err: string) => {
            console.error('Error: ' + err);
        });

        client.on('close', () => {
            console.log('Connection closed');
        });
    }

    listen() {

        const server = new net.Server();
        server.listen(port, function () {
            console.log('Server listening for connections');
        });

        server.on('connection', function (socket: net.Socket) {
            console.log('A new connection has been established.');

            // The server can also receive data from the client by reading from its socket.

            socket.on('data', (data: string) => {

                console.log('Received: ' + data);

            });

            socket.on('end', () => {
                console.log('Closing connection with the client');
            });

            // Don't forget to catch error, for your own sake.
            socket.on('error', (err: string) => {
                console.error(`Error: ${err}`);
            });
        });

    }
}