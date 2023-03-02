import * as net from 'net';
import level from 'level-ts';
import { SocketHandler } from './socket_handler'
import { MESSAGE_TYPES, UTXO } from './types';
import { parse_object, _hash_object } from './utils'

const port: number = 18018;

interface Connection {
    ip_address: string;
    socket_handler: SocketHandler;
}

export class Node {

    _longest_chain: string = '0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2';
    _chain_length: number = 1;
    _connections: Connection[] = [];
    _mempool: string[] = [];
    _mempool_utxo_set: UTXO[] = [];

    connect(ip_address: string) {

        const client = new net.Socket();
        const remote_ip = `${ip_address}:${port}`

        const socket_handler = new SocketHandler(client, remote_ip);

        this._bind_event_listener(socket_handler);

        socket_handler.connect(ip_address, port).then(() => {
            this._connections.push({ ip_address: remote_ip, socket_handler });
            let object_message: any = {
                "type": "getobject",
                "objectid": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
            };

            socket_handler._write(object_message);
        })

    }

    listen() {

        const server = new net.Server();
        server.listen(port, function () {
            console.log('Server listening for connections');
        });

        server.on('connection', (socket: net.Socket) => {

            const remote_ip: string = `${socket.remoteAddress}:${socket.remotePort}`
            const socket_handler = new SocketHandler(socket, remote_ip);
            this._bind_event_listener(socket_handler);
            socket_handler.do_handshake();

            this._connections.push({ ip_address: remote_ip, socket_handler });
            for (const connection of this._connections) {
                console.log(connection.ip_address);
            }

        });

    }

    async _update_mempool(block_id: string) {
        console.log("updating mempool");
        console.log(block_id);
        const utxo_db = new level("./utxos");
        const utxo_set = await utxo_db.get(block_id);
        this._mempool_utxo_set = utxo_set;
    }

    async _check_utxo(block_id: string) {
        const utxo_db = new level("./utxos");
        const utxo_set = await utxo_db.get(block_id);
        console.log(utxo_set);
    }

    async _add_to_mempool(transaction: any): Promise<void> {
        try {
            const transaction_type = parse_object(transaction);
            const tx_id = _hash_object(transaction);
            if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED) {
                if (transaction['height'] > this._chain_length) {
                    for (let i = 0; i < transaction['outputs'].length; i++) {
                        this._mempool.push(tx_id);
                        this._mempool_utxo_set.push({ outpoint_id: tx_id, idx: i });
                    }
                }
            } else {
                for (const input of transaction['inputs']) {
                    const outpoint = input['outpoint'];
                    const outpoint_txid = outpoint['txid'];
                    const outpoint_idx = outpoint['index'];
                    let found_utxo: Boolean = false;
                    for (let i = 0; i < this._mempool_utxo_set.length; i++) {
                        if (this._mempool_utxo_set[i].outpoint_id == outpoint_txid && this._mempool_utxo_set[i].idx == outpoint_idx) {
                            this._mempool_utxo_set.splice(i, 1);
                            i--;
                            found_utxo = true;
                        }
                    }
                    if (found_utxo) {
                        for (let i = 0; i < transaction['outputs'].length; i++) {
                            this._mempool.push(tx_id);
                            this._mempool_utxo_set.push({ outpoint_id: tx_id, idx: i });
                        }
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    async _find_forked_chains(block: any): Promise<[any, any]> {
        try {
            const db = new level("./database");
            let current_chain: [string, any][] = [];
            let current_block_hash = this._longest_chain
            while (current_block_hash) {
                const current_block = await db.get(current_block_hash);
                current_chain.push([current_block_hash, current_block]);
                current_block_hash = current_block['previd'];
            }
            let new_chain: [string, any][] = [];
            let new_chain_block_hash = _hash_object(block);
            while (new_chain_block_hash) {
                const current_block = await db.get(new_chain_block_hash);
                new_chain.push([new_chain_block_hash, current_block]);
                new_chain_block_hash = current_block['previd'];
            }


            for (let i = 0; i < new_chain.length; i++) {
                if (new_chain[i][0] != current_chain[i][0]) {
                    return [current_chain.splice(i).map((block) => block[1]), new_chain.splice(i).map((block) => block[1])];
                }
            }

            return [[], []];

        } catch (err) {
            console.error(err);
            return [[], []];
        }
    }

    async _handle_reorg(new_chain_tip: any): Promise<void> {
        try {
            const db = new level("./database");
            const [current_fork, new_fork] = await this._find_forked_chains(new_chain_tip);
            const current_fork_txids: string[] = current_fork.reduce((acc: string[], block: any) => [...acc, ...block['txids']], []);
            const new_fork_txids: string[] = new_fork.reduce((acc: string[], block: any) => [...acc, ...block['txids']], []);
            const current_mempool = current_fork_txids.concat(this._mempool)
            for (const tx_id of current_mempool) {
                if (!(tx_id in new_fork_txids)) {
                    const transaction = await db.get(tx_id);
                    this._add_to_mempool(transaction);
                }
            }

        } catch (err) {
            console.error(err);
        }
    }

    _bind_event_listener(socket_handler: SocketHandler) {

        socket_handler._event_emitter.on("newPeer", async (peer: string) => {

            try {

                const ip_address_components = peer.split(":");
                const host: string = ip_address_components[0];
                const port: number = parseInt(ip_address_components[1]);

                const client = new net.Socket();

                const socket_handler = new SocketHandler(client, peer);
                const succesful_connection = await socket_handler.connect(host, port);

                if (succesful_connection) {
                    this._connections.push({ ip_address: peer, socket_handler })
                    this._bind_event_listener(socket_handler);
                }

            } catch (err) {
                console.error(err);
            }
        })

        socket_handler._event_emitter.on("broadcast", (object_id: string) => {
            const broadcast_message: any = {
                "type": "ihaveobject",
                "objectid": object_id,
            }
            for (const connection of this._connections) {
                const socket_handler = connection.socket_handler;
                socket_handler._write(broadcast_message);
            }
        })

        socket_handler._event_emitter.on("unknownObjects", (unknown_tx_ids: string[]) => {
            for (const unknown_tx_id of unknown_tx_ids) {
                const broadcast_message: any = {
                    "type": "getobject",
                    "objectid": unknown_tx_id,
                }
                for (const connection of this._connections) {
                    const socket_handler = connection.socket_handler;
                    socket_handler._write(broadcast_message);
                }
            }
        })

        socket_handler._event_emitter.on("updateChain", (chain: [string, number, any]) => {
            const chaintip: string = chain[0];
            const chain_length: number = chain[1];
            const block: any = chain[2];
            if (chain_length > this._chain_length) {

                try {
                    const parent_block = block['previd'];
                    if (parent_block == this._longest_chain) {
                        this._chain_length = chain_length;
                        this._longest_chain = chaintip;
                        this._update_mempool(chaintip);
                        const tx_ids = block['txids'];
                        this._mempool = this._mempool.filter((tx_id) => {
                            return tx_ids.indexOf(tx_id) < 0;
                        });
                    } else {
                        this._update_mempool(chaintip);
                        this._handle_reorg(block);
                        this._chain_length = chain_length;
                        this._longest_chain = chaintip;
                    }
                } catch (err) {
                    console.error(err);
                    return;
                }


            }
        })

        socket_handler._event_emitter.on("chaintipRequest", () => {
            const json_message = {
                "type": "chaintip",
                "blockid": this._longest_chain,
            };
            socket_handler._write(json_message);
            console.log(this._chain_length);
        })

        socket_handler._event_emitter.on("newMempoolTx", (transaction: any) => {
            this._add_to_mempool(transaction);
        })

        socket_handler._event_emitter.on("mempoolRequest", () => {
            console.log(this._mempool_utxo_set);
            const json_message = {
                "type": "mempool",
                "txids": this._mempool,
            };
            socket_handler._write(json_message);
        })

        socket_handler._socket.on('close', () => {
            for (let i = 0; i < this._connections.length; i++) {
                if (this._connections[i].ip_address == socket_handler._remote_ip) {
                    this._connections.splice(i, 1);
                    i--;
                }
            }
        })

    }
}
