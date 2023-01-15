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
exports.listen = exports.connect = void 0;
const net = __importStar(require("net"));
const json_canonicalize_1 = require("json-canonicalize");
const port = 18018;
var MESSAGE_TYPES;
(function (MESSAGE_TYPES) {
    MESSAGE_TYPES[MESSAGE_TYPES["HELLO"] = 0] = "HELLO";
    MESSAGE_TYPES[MESSAGE_TYPES["PEERS_REQUEST"] = 1] = "PEERS_REQUEST";
    MESSAGE_TYPES[MESSAGE_TYPES["CHAINTIP"] = 2] = "CHAINTIP";
    MESSAGE_TYPES[MESSAGE_TYPES["MEMPOOL"] = 3] = "MEMPOOL";
    MESSAGE_TYPES[MESSAGE_TYPES["GET_OBJECT"] = 4] = "GET_OBJECT";
    MESSAGE_TYPES[MESSAGE_TYPES["INVALID"] = 5] = "INVALID";
})(MESSAGE_TYPES || (MESSAGE_TYPES = {}));
function parse_message(received_message) {
    let result = [];
    let messages = received_message.split("\n");
    for (let i = 0; i < messages.length; i++) {
        try {
            if (messages[i] == '') {
                continue;
            }
            let parsed_json = JSON.parse(messages[i]);
            switch (parsed_json["type"]) {
                case "hello":
                    result.push(MESSAGE_TYPES.HELLO);
                    break;
                case "getpeers":
                    result.push(MESSAGE_TYPES.PEERS_REQUEST);
                    break;
                case "getchaintip":
                    result.push(MESSAGE_TYPES.CHAINTIP);
                    break;
                case "getmempool":
                    result.push(MESSAGE_TYPES.MEMPOOL);
                    break;
                case "getobject":
                    result.push(MESSAGE_TYPES.GET_OBJECT);
                    break;
                default:
                    result.push(MESSAGE_TYPES.INVALID);
            }
        }
        catch (err) {
            result[i] = MESSAGE_TYPES.INVALID;
        }
    }
    if (result[messages.length - 1] == MESSAGE_TYPES.INVALID) {
        return [messages[messages.length - 1], result];
    }
    return ['', result];
}
function prepare_message(message_type) {
    let json_message;
    switch (message_type) {
        case MESSAGE_TYPES.HELLO:
            json_message = {
                type: "hello",
                version: "0.9.0",
                agent: "Marabu-Core Client 0.9"
            };
            break;
        case MESSAGE_TYPES.PEERS_REQUEST:
            json_message = {
                "type": "peers",
                "peers": [],
            };
            break;
        case MESSAGE_TYPES.MEMPOOL:
            json_message = {
                "type": "mempool",
                "txids": [],
            };
            break;
        case MESSAGE_TYPES.CHAINTIP:
            json_message = {
                "type": "chaintip",
                "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
            };
            break;
        case MESSAGE_TYPES.GET_OBJECT:
            break;
        case MESSAGE_TYPES.INVALID:
            json_message = {
                "type": "error",
                "name": "INVALID_FORMAT",
                "description": "invalid format received"
            };
            break;
    }
    if (!json_message) {
        return "";
    }
    let canonicalized_output = (0, json_canonicalize_1.canonicalize)(json_message);
    return canonicalized_output;
}
function connect() {
    const client = new net.Socket();
    let handshake_completed = false;
    let buffer = '';
    client.connect(port, '45.63.84.226', () => {
        console.log('Connected');
    });
    client.on('data', (data) => {
        let messages;
        [buffer, messages] = parse_message(buffer + data);
        console.log('Received: ' + data);
        for (const message of messages) {
            let response = prepare_message(message);
            if (response != "") {
                console.log(response);
                client.write(response + '\n');
            }
        }
        client.write(`{"type":"getpeers"}\n`);
        // let response: string = prepare_message(MESSAGE_TYPES.REQUEST_PEERS);
        // client.write(response + "\n");
    });
    client.on('error', (err) => {
        console.error('Error: ' + err);
    });
    client.on('close', () => {
        console.log('Connection closed');
    });
}
exports.connect = connect;
function listen() {
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
exports.listen = listen;
