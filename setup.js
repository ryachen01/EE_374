"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Server = void 0;
const net = __importStar(require("net"));
const json_canonicalize_1 = require("json-canonicalize");
const port = 18018;
var MESSAGE_TYPES;
(function (MESSAGE_TYPES) {
    MESSAGE_TYPES[MESSAGE_TYPES["HELLO_RECEIVED"] = 0] = "HELLO_RECEIVED";
    MESSAGE_TYPES[MESSAGE_TYPES["SEND_HELLO"] = 1] = "SEND_HELLO";
    MESSAGE_TYPES[MESSAGE_TYPES["PEERS_REQUEST"] = 2] = "PEERS_REQUEST";
    MESSAGE_TYPES[MESSAGE_TYPES["PEERS_RECEIVED"] = 3] = "PEERS_RECEIVED";
    MESSAGE_TYPES[MESSAGE_TYPES["REQUEST_PEERS"] = 4] = "REQUEST_PEERS";
    MESSAGE_TYPES[MESSAGE_TYPES["CHAINTIP_REQUEST"] = 5] = "CHAINTIP_REQUEST";
    MESSAGE_TYPES[MESSAGE_TYPES["CHAINTIP_RECEIVED"] = 6] = "CHAINTIP_RECEIVED";
    MESSAGE_TYPES[MESSAGE_TYPES["REQUEST_CHAINTIP"] = 7] = "REQUEST_CHAINTIP";
    MESSAGE_TYPES[MESSAGE_TYPES["MEMPOOL_REQUEST"] = 8] = "MEMPOOL_REQUEST";
    MESSAGE_TYPES[MESSAGE_TYPES["MEMPOOL_RECEIVED"] = 9] = "MEMPOOL_RECEIVED";
    MESSAGE_TYPES[MESSAGE_TYPES["REQUEST_MEMPOOL"] = 10] = "REQUEST_MEMPOOL";
    MESSAGE_TYPES[MESSAGE_TYPES["OBJECT_REQUEST"] = 11] = "OBJECT_REQUEST";
    MESSAGE_TYPES[MESSAGE_TYPES["OBJECT_RECEIVED"] = 12] = "OBJECT_RECEIVED";
    MESSAGE_TYPES[MESSAGE_TYPES["REQUEST_OBJECT"] = 13] = "REQUEST_OBJECT";
    MESSAGE_TYPES[MESSAGE_TYPES["HAS_OBJECT"] = 14] = "HAS_OBJECT";
    MESSAGE_TYPES[MESSAGE_TYPES["NO_MESSAGE"] = 15] = "NO_MESSAGE";
})(MESSAGE_TYPES || (MESSAGE_TYPES = {}));
var INVALID_TYPES;
(function (INVALID_TYPES) {
    INVALID_TYPES[INVALID_TYPES["INVALID_FORMAT"] = 16] = "INVALID_FORMAT";
    INVALID_TYPES[INVALID_TYPES["INTERNAL_ERROR"] = 17] = "INTERNAL_ERROR";
    INVALID_TYPES[INVALID_TYPES["UNKNOWN_OBJECT"] = 18] = "UNKNOWN_OBJECT";
    INVALID_TYPES[INVALID_TYPES["UNFINDABLE_OBJECT"] = 19] = "UNFINDABLE_OBJECT";
    INVALID_TYPES[INVALID_TYPES["INVALID_HANDSHAKE"] = 20] = "INVALID_HANDSHAKE";
    INVALID_TYPES[INVALID_TYPES["INVALID_TX_OUTPOINT"] = 21] = "INVALID_TX_OUTPOINT";
    INVALID_TYPES[INVALID_TYPES["INVALID_TX_SIGNATURE"] = 22] = "INVALID_TX_SIGNATURE";
    INVALID_TYPES[INVALID_TYPES["INVALID_TX_CONSERVATION"] = 23] = "INVALID_TX_CONSERVATION";
    INVALID_TYPES[INVALID_TYPES["INVALID_BLOCK_COINBASE"] = 24] = "INVALID_BLOCK_COINBASE";
    INVALID_TYPES[INVALID_TYPES["INVALID_BLOCK_TIMESTAMP"] = 25] = "INVALID_BLOCK_TIMESTAMP";
    INVALID_TYPES[INVALID_TYPES["INVALID_BLOCK_POW"] = 26] = "INVALID_BLOCK_POW";
    INVALID_TYPES[INVALID_TYPES["INVALID_GENESIS"] = 27] = "INVALID_GENESIS";
})(INVALID_TYPES || (INVALID_TYPES = {}));
class Server {
    constructor() {
        this.handshake_completed = false;
    }
    parse_message(received_message) {
        let result;
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
        }
        catch (err) {
            result = INVALID_TYPES.INVALID_FORMAT;
        }
        return result;
    }
    prepare_message(message_type) {
        let json_message;
        switch (message_type) {
            case MESSAGE_TYPES.HELLO_RECEIVED:
                this.handshake_completed = true;
                break;
            case MESSAGE_TYPES.SEND_HELLO:
                json_message = {
                    "type": "hello",
                    "version": "0.9.0",
                    "agent": "Marabu-Core Client 0.9"
                };
                break;
            case MESSAGE_TYPES.PEERS_REQUEST:
                json_message = {
                    "type": "peers",
                    "peers": [],
                };
                break;
            case MESSAGE_TYPES.PEERS_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_PEERS:
                json_message = {
                    "type": "getpeers",
                };
                break;
            case MESSAGE_TYPES.MEMPOOL_REQUEST:
                json_message = {
                    "type": "mempool",
                    "txids": [],
                };
                break;
            case MESSAGE_TYPES.MEMPOOL_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_MEMPOOL:
                json_message = {
                    "type": "getmempool",
                };
                break;
            case MESSAGE_TYPES.CHAINTIP_REQUEST:
                json_message = {
                    "type": "chaintip",
                    "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
                };
                break;
            case MESSAGE_TYPES.CHAINTIP_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_CHAINTIP:
                json_message = {
                    "type": "getchaintip",
                };
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
                };
                break;
            case MESSAGE_TYPES.OBJECT_RECEIVED:
                break;
            case MESSAGE_TYPES.REQUEST_OBJECT:
                json_message = {
                    "type": "getobject",
                    "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8",
                };
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
        let canonicalized_output = (0, json_canonicalize_1.canonicalize)(json_message);
        return canonicalized_output;
    }
    connect() {
        const client = new net.Socket();
        let buffer = '';
        client.connect(port, '45.63.84.226', () => {
            console.log('Connected');
            let hello_message = this.prepare_message(MESSAGE_TYPES.SEND_HELLO);
            client.write(hello_message + '\n');
            let peers_message = this.prepare_message(MESSAGE_TYPES.REQUEST_PEERS);
            client.write(peers_message + '\n');
            let message_to_send = this.prepare_message(INVALID_TYPES.INVALID_FORMAT);
            client.write(message_to_send + '\n');
        });
        client.on('data', (data) => {
            console.log(`Received: ${data.toString()}`);
            buffer += data.toString();
            let eom = buffer.indexOf('\n');
            while (eom != -1) {
                let message = buffer.substring(0, eom);
                let message_type = this.parse_message(message);
                let message_to_send = this.prepare_message(message_type);
                if (message_type in MESSAGE_TYPES && !this.handshake_completed) {
                    message_to_send = this.prepare_message(INVALID_TYPES.INVALID_HANDSHAKE);
                }
                if (message_to_send != 'undefined') {
                    console.log(`Sent: ${message_to_send}\n`);
                    client.write(message_to_send + '\n');
                }
                buffer = buffer.substring(eom + 1);
                eom = buffer.indexOf('\n');
            }
        });
        client.on('error', (err) => {
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
        server.on('connection', function (socket) {
            console.log('A new connection has been established.');
            // The server can also receive data from the client by reading from its socket.
            socket.on('data', (data) => {
                console.log('Received: ' + data);
            });
            socket.on('end', () => {
                console.log('Closing connection with the client');
            });
            // Don't forget to catch error, for your own sake.
            socket.on('error', (err) => {
                console.error(`Error: ${err}`);
            });
        });
    }
}
exports.Server = Server;
