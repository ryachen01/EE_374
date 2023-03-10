import * as blake2 from 'blake2';
import * as fs from 'fs';
import * as net from 'net';
import level from 'level-ts';
import { EventEmitter } from "events";
import { canonicalize } from 'json-canonicalize';
import { parse_message } from './message';
import { check_valid_ip, check_valid_dns, sleep, _hash_object } from './utils';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';
import { validate_transaction, validate_coinbase, validate_block } from './validation'
import peers_json from './peers.json'

export class SocketHandler {

    _socket: net.Socket;
    _remote_ip: string;

    _handshake_completed: Boolean = false;
    _buffer: string = "";
    _timer_id: NodeJS.Timeout | null = null;

    // keeps track of blocks validating as part of recursive validation
    // any errors these blocks make should result in an unfindable object error
    _parent_blocks: Set<string> = new Set();

    _error_count: number = 0;
    _error_threshold: number = 50;
    _timeout_length: number = 3000;
    _max_buffer_size: number = 1000000;
    _cur_message_count: number = 0;
    _message_threshold: number = 200;

    _event_emitter = new EventEmitter();



    constructor(socket: net.Socket, remote_ip: string) {

        this._socket = socket;
        this._remote_ip = remote_ip;

        const rate_limiter = setInterval(() => {
            if (this._cur_message_count > this._message_threshold) {
                this._fatal_error("rate limited");
                clearInterval(rate_limiter);
            } else {
                this._cur_message_count = 0;
            }
        }, 250);

        this._socket.on('data', (data: string) => {
            this._data_handler(data);
        })

        this._socket.on('end', () => {
            console.log(`Closing connection with ${this._remote_ip}`);
            this._socket.destroy();
        });

        this._socket.on('error', (err: string) => {
            console.error(`Error: ${err}`);
        });

        this._socket.on('close', () => {
            console.log(`Connection closed with ${this._remote_ip}`);
            this._socket.destroy();
        })

        this._socket.on('drain', () => { })
        this._socket.on('lookup', () => { })
        this._socket.on('ready', () => { })
        this._socket.on('timeout', () => { })

    };

    _non_fatal_error(err: string) {
        console.error(`Error triggered by ${this._remote_ip}: ${err}`);
        this._error_count++;

        if (this._error_count >= this._error_threshold) {
            this._fatal_error("too many non fatal errors");
        }
    }

    _fatal_error(err: string) {
        console.error(`Fatal error triggered by ${this._remote_ip}: ${err}`);
        this.close_connection();
    }

    connect(ip_address: string, port: number): Promise<Boolean> {
        let connection_timer: any;
        return new Promise((resolve) => {
            connection_timer = setTimeout(() => {
                console.log("failed to connect to node");
                // this._fatal_error("failed to connect to node");
                resolve(false);
            }, this._timeout_length);

            this._socket.connect(port, ip_address, () => {
                clearTimeout(connection_timer);
                console.log(`Connected to ${this._remote_ip}`);

                this.do_handshake();
                resolve(true);
            });

            // imediately fails to connect
            this._socket.on('error', (err: string) => {
                clearTimeout(connection_timer);
                resolve(false);
            });

        });
    }

    _send_hello() {
        const json_message = {
            "type": "hello",
            "version": "0.9.0",
            "agent": "Marabu-Core Client 0.9",
        }
        this._write(json_message);
    }

    _request_peers() {
        const json_message = {
            "type": "getpeers",
        }
        this._write(json_message);
    }

    _request_chaintip() {
        const json_message = {
            "type": "getchaintip",
        }
        this._write(json_message);
    }


    do_handshake() {
        this._send_hello();
        this._request_peers();
        this._request_chaintip();
    }

    _check_handshake() {

        if (!this._handshake_completed) {
            const json_message: any =
            {
                "type": "error",
                "name": "INVALID_HANDSHAKE",
                "description": "The peer sent other validly formatted messages before sending a valid hello message."
            };
            this._write(json_message);
            this._fatal_error("invalid handshake");
        }

    }

    _handle_message(message: string, message_type: MESSAGE_TYPES | INVALID_TYPES): void {

        let json_message: any = null;

        try {

            switch (message_type) {
                case MESSAGE_TYPES.HELLO_RECEIVED:
                    this._handshake_completed = true;
                    break;
                case MESSAGE_TYPES.PEERS_REQUEST:
                    this._check_handshake();
                    const peers_list: string[] = peers_json["peers"];
                    json_message = {
                        "type": "peers",
                        "peers": peers_list,
                    }
                    this._write(json_message);
                    break;
                case MESSAGE_TYPES.PEERS_RECEIVED:
                    this._check_handshake();
                    break;

                case MESSAGE_TYPES.MEMPOOL_REQUEST:
                    this._check_handshake();
                    this._event_emitter.emit("mempoolRequest");
                    break;
                case MESSAGE_TYPES.MEMPOOL_RECEIVED:
                    this._check_handshake();
                    break;

                case MESSAGE_TYPES.CHAINTIP_REQUEST:
                    this._check_handshake();
                    this._event_emitter.emit("chaintipRequest");
                    break;
                case MESSAGE_TYPES.CHAINLENGTH_REQUEST:
                    this._check_handshake();
                    this._event_emitter.emit("chainlengthRequest");
                    break;
                case MESSAGE_TYPES.CHAINTIP_RECEIVED:
                    this._check_handshake();
                    break;

                case MESSAGE_TYPES.OBJECT_REQUEST:
                    this._check_handshake();
                    break;
                case MESSAGE_TYPES.BLOCK_RECEIVED:
                    this._check_handshake();
                    break;
                case MESSAGE_TYPES.TRANSACTION_RECEIVED:
                    this._check_handshake();
                    break;
                case MESSAGE_TYPES.COINBASE_RECEIVED:
                    this._check_handshake();
                    break;
                case MESSAGE_TYPES.HAS_OBJECT:
                    this._check_handshake();
                    break;
                case MESSAGE_TYPES.ERROR_RECEIVED:
                    break;
                case INVALID_TYPES.INVALID_MESSAGE:
                    var json_object = JSON.parse(message)["object"];
                    var hash_output = _hash_object(json_object);
                    if (this._parent_blocks.has(hash_output)) {
                        const error_message = {
                            "type": "error",
                            "name": "UNFINDABLE_OBJECT",
                            "description": "The object requested could not be found in the node's network."
                        }
                        this._write(error_message);
                        this._fatal_error("object requested could not be found in the node's network");
                        this._parent_blocks.delete(hash_output);
                        break;
                    } else {
                        json_message =
                        {
                            "type": "error",
                            "name": "INVALID_FORMAT",
                            "description": "The type of the received message is invalid"
                        };
                        this._write(json_message);
                        this._fatal_error("received message with invalid type");
                        break;
                    }

                case INVALID_TYPES.INVALID_FORMAT:
                    var json_object = JSON.parse(message)["object"];
                    var hash_output = _hash_object(json_object);
                    if (this._parent_blocks.has(hash_output)) {
                        const error_message = {
                            "type": "error",
                            "name": "UNFINDABLE_OBJECT",
                            "description": "The object requested could not be found in the node's network."
                        }
                        this._write(error_message);
                        this._fatal_error("object requested could not be found in the node's network");
                        this._parent_blocks.delete(hash_output);
                        break;
                    } else {
                        json_message =
                        {
                            "type": "error",
                            "name": "INVALID_FORMAT",
                            "description": "The format of the received message is invalid."
                        };
                        this._write(json_message);
                        this._fatal_error("received invalid format");
                        break;
                    }
            }
        } catch (err) {
            console.error(err);
            json_message =
            {
                "type": "error",
                "name": "INVALID_FORMAT",
                "description": "The format of the received message is invalid."
            };
            this._write(json_message);
            this._fatal_error("received invalid format");
            return;
        }
    }

    _update_json_list(json_path: string, new_json: any): void {

        try {
            fs.writeFileSync(json_path, JSON.stringify(new_json));
        } catch (error) {
            this._non_fatal_error("failed to update file");
        }

    }

    _handle_new_peers(message: string): void {
        try {

            let exisitng_peers: string[] = peers_json["peers"];
            const new_peers_json: any = JSON.parse(message);
            const new_peers_list: string[] = new_peers_json["peers"];

            for (const peer of new_peers_list) {

                if (check_valid_ip(peer) || check_valid_dns(peer)) {

                    const ip_address_components = peer.split(":");
                    const host: string = ip_address_components[0];
                    const port: number = parseInt(ip_address_components[1]);

                    if (exisitng_peers.indexOf(peer) == -1) {
                        console.log("trying to add new peer: ", peer);

                        exisitng_peers.push(peer);
                        this._update_json_list("./peers.json", peers_json);
                    }
                    this._event_emitter.emit('newPeer', peer);
                } else {
                    console.log("invalid ip: ", peer);
                }
            }

        } catch (err) {
            this._non_fatal_error("failed to read new peers");
        }

    }

    async _update_longest_chain(object: string) {
        try {
            const db = new level("./database");
            let length: number = 1;
            const json_object = JSON.parse(object)["object"];
            let hash_output = _hash_object(json_object);
            let parent_hash = json_object['previd'];
            while (parent_hash) {
                const parent_object = await db.get(parent_hash);
                parent_hash = parent_object['previd'];
                length++;
            }
            this._event_emitter.emit("updateChain", [hash_output, length, json_object]);
        } catch (err) {
            console.error(err);
            return;
        }
    }

    async _check_parent_block(object: string, retry_count: number = 0): Promise<Boolean> {
        const db = new level("./database");
        const validating_db = new level("./currently_validating_db");
        if (retry_count >= 300) {
            return false;
        }
        try {
            const object_json = JSON.parse(object)['object'];
            const block_hash = _hash_object(object_json);
            if (block_hash == '0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2') {
                return true;
            }
            const parent_hash = object_json['previd'];

            if (!parent_hash) {
                if (!this._parent_blocks.has(block_hash)) {
                    const error_message = {
                        "type": "error",
                        "name": "INVALID_GENESIS",
                        "description": "The block has a previd of null but it isn't genesis.",
                    }
                    this._write(error_message);
                    this._fatal_error("block has a previd of null but it isn't genesis");
                }
                return false;
            }
            if (await db.exists(parent_hash)) {
                return true;
            } else {

                if (!(await validating_db.exists(parent_hash)) && retry_count >= 10) {
                    return false;
                }

                if (retry_count == 0) {
                    this._parent_blocks.add(parent_hash);
                    this._event_emitter.emit("unknownObjects", [parent_hash]); // because everything is recursive we end up spamming nodes with requests if we're missing even 1 block
                }
                await sleep(300);
                return this._check_parent_block(object, retry_count + 1);
            }


        } catch (err) {
            console.error(err);
            return false;
        }
    }

    async remove_from_currently_validating_db(hash: string) {

        try {
            const db = new level("./currently_validating_db");
            if (await db.exists(hash)) {
                await db.del(hash);
            }
        } catch (err) {
            console.error(err);
            return;
        }
    }

    async _handle_new_object(object: string, object_type: MESSAGE_TYPES) {

        let error_message: any;
        let json_object: any;
        let hash_output: string;

        try {
            json_object = JSON.parse(object)["object"];
            hash_output = _hash_object(json_object);
            const db = new level("./database");
            if (await db.exists(hash_output)) {
                return;
            }
        } catch (err) {
            console.error(err);
            return;
        }

        switch (object_type) {
            case MESSAGE_TYPES.BLOCK_RECEIVED:
                // this._currently_validating_blocks.add(hash_output);
                const db = new level("./currently_validating_db");
                if (await db.exists(hash_output)) {
                    return;
                }
                await db.put(hash_output, null);

                // const valid_parent = await this._check_parent_block(object, this._event_emitter);
                // if (!valid_parent) {
                //     console.error("parent block has error");
                //     error_message = {
                //         "type": "error",
                //         "name": "UNFINDABLE_OBJECT",
                //         "description": "The object requested could not be found in the node's network."
                //     }
                //     this._write(error_message);
                //     this._fatal_error("object requested could not be found in the node's network");
                //     this._parent_blocks.delete(hash_output);
                //     // this._currently_validating_blocks.delete(hash_output);
                //     await this.remove_from_currently_validating_db(hash_output);
                //     return;
                // }

                let block_error: void | INVALID_TYPES = await validate_block(object, this);
                if (this._parent_blocks.has(hash_output)) {
                    if (block_error) {
                        error_message = {
                            "type": "error",
                            "name": "UNFINDABLE_OBJECT",
                            "description": "The object requested could not be found in the node's network."
                        }
                        this._write(error_message);
                        this._fatal_error("object requested could not be found in the node's network");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                    }
                }
                switch (block_error) {
                    case INVALID_TYPES.INVALID_BLOCK_POW:
                        error_message = {
                            "type": "error",
                            "name": "INVALID_BLOCK_POW",
                            "description": "The block proof-of-work is invalid.",
                        }
                        this._write(error_message);
                        this._fatal_error("block proof-of-work is invalid");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                    case INVALID_TYPES.INVALID_BLOCK_COINBASE:
                        error_message = {
                            "type": "error",
                            "name": "INVALID_BLOCK_COINBASE",
                            "description": "The block coinbase transaction is invalid."
                        }
                        this._write(error_message);
                        this._fatal_error("block coinbase transaction is invalid");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                    case INVALID_TYPES.UNFINDABLE_OBJECT:
                        error_message = {
                            "type": "error",
                            "name": "UNFINDABLE_OBJECT",
                            "description": "The object requested could not be found in the node's network."
                        }
                        this._write(error_message);
                        this._fatal_error("object requested could not be found in the node's network");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                    case INVALID_TYPES.INVALID_TX_OUTPOINT:
                        error_message = {
                            "type": "error",
                            "name": "INVALID_TX_OUTPOINT",
                            "description": "The transaction outpoint is incorrect."
                        }
                        this._write(error_message);
                        this._fatal_error("transaction outpoint is incorrect");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                    case INVALID_TYPES.INVALID_BLOCK_TIMESTAMP:
                        error_message = {
                            "type": "error",
                            "name": "INVALID_BLOCK_TIMESTAMP",
                            "description": "The block timestamp is invalid."
                        }
                        this._write(error_message);
                        this._fatal_error("block timestamp is invalid");
                        this._parent_blocks.delete(hash_output);
                        await this.remove_from_currently_validating_db(hash_output);
                        return;
                }
                this._parent_blocks.delete(hash_output);
                this._update_longest_chain(object);
                await this.remove_from_currently_validating_db(hash_output);
                break;
            case MESSAGE_TYPES.TRANSACTION_RECEIVED:
                let tx_error: void | INVALID_TYPES = await validate_transaction(object);
                switch (tx_error) {
                    case INVALID_TYPES.UNKNOWN_OBJECT:
                        error_message =
                        {
                            "type": "error",
                            "name": "UNKNOWN_OBJECT",
                            "description": "The transaction has an unknown object."
                        };
                        this._write(error_message);
                        this._fatal_error("received transaction with unknown object");
                        return;
                    case INVALID_TYPES.INVALID_TX_OUTPOINT:
                        error_message =
                        {
                            "type": "error",
                            "name": "INVALID_TX_OUTPOINT",
                            "description": "The transaction outpoint index is too large"
                        };
                        this._write(error_message);
                        this._fatal_error("transaction outpoint index is too large");
                        return;
                    case INVALID_TYPES.INVALID_TX_CONSERVATION:
                        error_message =
                        {
                            "type": "error",
                            "name": "INVALID_TX_CONSERVATION",
                            "description": "The transaction does not satisfy the weak law of conservation."
                        };
                        this._write(error_message);
                        this._fatal_error("transaction does not satisfy the weak law of conservation");
                        return;
                    case INVALID_TYPES.INVALID_TX_SIGNATURE:
                        error_message =
                        {
                            "type": "error",
                            "name": "INVALID_TX_SIGNATURE",
                            "description": "The transaction signature is invalid."
                        };
                        this._write(error_message);
                        this._fatal_error("transaction signature is invalid");
                        return;
                }
                break;
            case MESSAGE_TYPES.COINBASE_RECEIVED:
                validate_coinbase(object);
                break;
        }

        try {
            this._save_object(json_object, hash_output);
            if (object_type == MESSAGE_TYPES.COINBASE_RECEIVED || object_type == MESSAGE_TYPES.TRANSACTION_RECEIVED) {
                this._event_emitter.emit("newMempoolTx", json_object);
            }
        } catch (err) {
            this._non_fatal_error("failed to handle object");
        }
    }

    async _save_object(object: string, object_id: string) {

        if (this._socket.destroyed) {
            return;
        }

        const db = new level('./database');

        try {
            const has_object: Boolean = await db.exists(object_id);
            if (!has_object) {
                console.log("found new object:", object_id);
                await db.put(object_id, object);
                this._broadcast_new_object(object_id);
            } else {
                console.log(`found existing object: ${object_id}`);
            }
        } catch (err) {
            this._fatal_error("failed to save object");
        }

    }

    async _broadcast_new_object(object_id: string) {

        console.log("attempting broadcast");
        this._event_emitter.emit('broadcast', object_id);

    }

    async _handle_object_broadcast(object: string) {

        const db = new level('./database');
        try {
            const object_id: string = JSON.parse(object)["objectid"];
            const has_object: Boolean = await db.exists(object_id);
            if (!has_object) {
                const request_message: any = {
                    "type": "getobject",
                    "objectid": object_id
                }
                this._write(request_message);
            }

        } catch (err) {
            console.error(err);
            this._fatal_error("failed to handle object broadcast");
        }
    }

    async _handle_object_request(message: string) {
        const db = new level('./database');
        try {
            const object_id = JSON.parse(message)["objectid"];
            const has_object: Boolean = await db.exists(object_id);
            if (has_object) {
                const object = await db.get(object_id);
                const request_message = {
                    "type": "object",
                    "object": object,
                }
                this._write(request_message);
            }

        } catch (err) {
            this._fatal_error("failed to handle object request");
        }

    }

    async _handle_chaintip(message: string) {
        const db = new level('./database');
        try {
            const block_id = JSON.parse(message)["blockid"];
            const has_object: Boolean = await db.exists(block_id);
            if (!has_object) {
                const request_message = {
                    "type": "getobject",
                    "objectid": block_id,
                }
                this._write(request_message);
            }

        } catch (err) {
            this._fatal_error("failed to handle chaintip");
        }
    }

    _handle_mempool(message: string) {
        try {
            const mempool_ids = JSON.parse(message)['txids']
            this._event_emitter.emit("unknownObjects", mempool_ids);
        } catch (err) {
            this._fatal_error("failed to handle mempool");
        }
    }

    _data_handler(data: string) {

        if (this._socket.destroyed) {
            return;
        }

        console.log(`Received from ${this._remote_ip}: ` + data);

        this._buffer += data.toString();
        if (this._buffer.length >= this._max_buffer_size) {
            this._handle_buffer_overflow();
        }
        let eom = this._buffer.indexOf('\n');
        while (eom != -1) {
            if (this._socket.destroyed || this._cur_message_count > this._message_threshold) {
                return;
            }

            if (this._timer_id) {
                clearTimeout(this._timer_id);
                this._timer_id = null;
            }
            let message: string = this._buffer.substring(0, eom);
            let message_type: MESSAGE_TYPES | INVALID_TYPES = parse_message(message);

            this._handle_message(message, message_type);

            this._cur_message_count++;

            if (message_type == MESSAGE_TYPES.PEERS_RECEIVED) {
                this._handle_new_peers(message);
            } else if (message_type == MESSAGE_TYPES.BLOCK_RECEIVED || message_type == MESSAGE_TYPES.COINBASE_RECEIVED || message_type == MESSAGE_TYPES.TRANSACTION_RECEIVED) {
                this._handle_new_object(message, message_type);
            } else if (message_type == MESSAGE_TYPES.HAS_OBJECT) {
                this._handle_object_broadcast(message);
            } else if (message_type == MESSAGE_TYPES.OBJECT_REQUEST) {
                this._handle_object_request(message);
            } else if (message_type == MESSAGE_TYPES.CHAINTIP_RECEIVED) {
                this._handle_chaintip(message);
            } else if (message_type == MESSAGE_TYPES.MEMPOOL_RECEIVED) {
                this._handle_mempool(message);
            }

            this._buffer = this._buffer.substring(eom + 1)
            eom = this._buffer.indexOf('\n')
        }
        if (this._buffer != '' && !this._timer_id) {
            this._timer_id = setTimeout(this._handle_timeout.bind(this), this._timeout_length);
        }

        return;
    }

    _handle_buffer_overflow() {

        const json_message: any =
        {
            "type": "error",
            "name": "INVALID_FORMAT",
            "description": "Message exceeds maximum length."
        };
        this._write(json_message);
        this._fatal_error("buffer overflow");
    }

    _handle_timeout() {

        const json_message: any =
        {
            "type": "error",
            "name": "INVALID_FORMAT",
            "description": "Took too long to complete message."
        };
        console.log(json_message);
        this._write(json_message);
        this._fatal_error("buffer timeout");

    }

    _write(data: any) {
        if (this._socket.destroyed) {
            return;
        }
        try {
            const canonicalized_message: string = canonicalize(data);
            console.log(`Sent to ${this._remote_ip}: ${canonicalized_message}\n`)
            this._socket.write(canonicalized_message + '\n');
        } catch (err) {
            console.error(`failed to send: ${data}`)
        }

    }

    close_connection() {

        if (this._timer_id) {
            clearTimeout(this._timer_id);
        }
        if (!this._socket.destroyed) {
            this._socket.destroy();
        }

    }

}