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
const port = 18018;
function connect() {
    const client = new net.Socket();
    client.connect(port, '45.63.84.226', () => {
        console.log('Connected');
    });
    client.on('data', (data) => {
        console.log('Received: ' + data);
    });
    client.on('error', (err) => {
        console.error('Error: ' + err);
        client.destroy();
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
