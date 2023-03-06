import * as net from 'net';
import { canonicalize } from 'json-canonicalize';

const port: number = 18018;

export class LightNode {

    _client: net.Socket;

    constructor(ip_address: string = "127.0.0.1") {
        this._client = new net.Socket();

        this._client.connect(port, ip_address, () => {
        });
        this._client.on('data', (data: string) => {
            console.log('Received: ', data.toString());
        });
        this._client.on('end', () => {
            console.log('Closing connection');
            this._client.destroy();
        });

        this._client.on('error', (err: string) => {
            console.error(`Error: ${err}`);
        });

        this._client.on('close', () => {
            console.log('Connection closed');
            this._client.destroy();
        })

        this._client.on('drain', () => { })
        this._client.on('lookup', () => { })
        this._client.on('ready', () => { })
        this._client.on('timeout', () => { })

    }

    _write(data: any) {
        if (this._client.destroyed) {
            return;
        }

        try {
            const canonicalized_message: string = canonicalize(data);
            console.log(`Sent: ${canonicalized_message}\n`)
            this._client.write(canonicalized_message + '\n');
        } catch (err) {
            console.error(`failed to send: ${data}`)
        }

    }
}