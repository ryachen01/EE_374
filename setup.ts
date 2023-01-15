import * as net from 'net';
import { canonicalize } from 'json-canonicalize';

const port: number = 18018;

enum MESSAGE_TYPES {
    HELLO,
    PEERS_REQUEST,
    CHAINTIP,
    MEMPOOL,
    GET_OBJECT,
    INVALID
}

function parse_message(received_message: string): [string, Array<MESSAGE_TYPES>] {

    let result: Array<MESSAGE_TYPES> = [];

    let messages: Array<string> = received_message.split("\n");
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
        } catch (err) {
            result[i] = MESSAGE_TYPES.INVALID;
        }
    }

    if (result[messages.length - 1] == MESSAGE_TYPES.INVALID) {
        return [messages[messages.length - 1], result];
    }

    return ['', result];

}

function prepare_message(message_type: MESSAGE_TYPES): string {
    let json_message;
    switch (message_type) {
        case MESSAGE_TYPES.HELLO:
            json_message = {
                type: "hello",
                version: "0.9.0",
                agent: "Marabu-Core Client 0.9"
            }
            break;
        case MESSAGE_TYPES.PEERS_REQUEST:
            json_message = {
                "type": "peers",
                "peers": [],
            }
            break;
        case MESSAGE_TYPES.MEMPOOL:
            json_message = {
                "type": "mempool",
                "txids": [],
            }
            break;
        case MESSAGE_TYPES.CHAINTIP:
            json_message = {
                "type": "chaintip",
                "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
            }
            break;
        case MESSAGE_TYPES.GET_OBJECT:
            break;
        case MESSAGE_TYPES.INVALID:
            json_message = {
                "type": "error",
                "name": "INVALID_FORMAT",
                "description": "invalid format received"
            }
            break;

    }
    if (!json_message) {
        return "";
    }
    let canonicalized_output: string = canonicalize(json_message);
    return canonicalized_output;
}

export function connect() {
    const client = new net.Socket();
    let handshake_completed = false;

    let buffer: string = '';

    client.connect(port, '45.63.84.226', () => {
        console.log('Connected');
    });

    client.on('data', (data: string) => {
        let messages: Array<MESSAGE_TYPES>;
        [buffer, messages] = parse_message(buffer + data);
        console.log('Received: ' + data);
        for (const message of messages) {
            let response: string = prepare_message(message);
            if (response != "") {
                console.log(response);
                client.write(response + '\n');
            }
        }
    });

    client.on('error', (err: string) => {
        console.error('Error: ' + err);
    });

    client.on('close', () => {
        console.log('Connection closed');
    });
}

export function listen() {

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