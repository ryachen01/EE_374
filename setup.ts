import * as net from 'net';

const port: number = 18018;

export function connect() {
    const client = new net.Socket();

    client.connect(port, '45.63.84.226', () => {
        console.log('Connected');
    });

    client.on('data', (data: string) => {
        console.log('Received: ' + data);
    });

    client.on('error', (err: string) => {
        console.error('Error: ' + err);
        client.destroy();
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