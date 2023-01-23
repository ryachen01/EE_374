import * as t from 'io-ts';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';

function _is_hex(str: string) {
    let pattern = /[0-9A-Fa-f]{6}/g;
    return str.match(pattern)
}

export function parse_message(received_message: string): MESSAGE_TYPES | INVALID_TYPES {

    let result: MESSAGE_TYPES | INVALID_TYPES = INVALID_TYPES.INVALID_MESSAGE;

    try {

        let parsed_json = JSON.parse(received_message);
        switch (parsed_json["type"]) {
            case "hello":
                const HELLO_TYPE = t.exact(t.type({
                    type: t.string,
                    version: t.string,
                    agent: t.string
                }));
                if (HELLO_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.HELLO_RECEIVED);
                    if (parsed_json["version"].slice(0, -1) != "0.9.") {
                        result = INVALID_TYPES.INVALID_FORMAT;
                    }
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }

                break;
            case "getpeers":
                const PEERS_REQUEST_TYPE = t.exact(t.type({
                    type: t.string,
                }));
                if (PEERS_REQUEST_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.PEERS_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getchaintip":
                const CHAINTIP_REQUEST_TYPE = t.exact(t.type({
                    type: t.string,
                }));
                if (CHAINTIP_REQUEST_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.CHAINTIP_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getmempool":
                const MEMPOOL_REQUEST_TYPE = t.exact(t.type({
                    type: t.string,
                }));
                if (MEMPOOL_REQUEST_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.MEMPOOL_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getobject":
                const OBJECT_REQUEST_TYPE = t.exact(t.type({
                    type: t.string,
                    objectid: t.string
                }));
                if (OBJECT_REQUEST_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.OBJECT_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "peers":
                const PEERS_RECEIVED_TYPE = t.exact(t.type({
                    type: t.string,
                    peers: t.array(t.string)
                }));
                if (PEERS_RECEIVED_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.PEERS_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "chaintip":
                const CHAINTIP_RECEIVED_TYPE = t.exact(t.type({
                    type: t.string,
                    blockid: t.string
                }));
                if (CHAINTIP_RECEIVED_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.CHAINTIP_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "mempool":
                const MEMPOOL_RECEIVED_TYPE = t.exact(t.type({
                    type: t.string,
                    txids: t.array(t.string)
                }));
                if (MEMPOOL_RECEIVED_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.MEMPOOL_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "object":
                const OBJECT_RECEIVED_TYPE = t.exact(t.type({
                    type: t.string,
                    object: t.type({
                        type: t.string
                    })
                }));
                if (OBJECT_RECEIVED_TYPE.decode(parsed_json)._tag === "Right") {

                    const BLOCK_TYPE = t.exact(t.type({
                        type: t.string,
                        txids: t.array(t.string),
                        nonce: t.string,
                        previd: t.string,
                        created: t.number,
                        T: t.string,
                    }));

                    const TRANSACTION_TYPE = t.exact(t.type({
                        type: t.string,
                        inputs: t.array(t.type({
                            outpoint: t.type({
                                txid: t.string,
                                index: t.number,
                            }),
                            sig: t.string,
                        })),
                        outputs: t.array(t.type({
                            pubkey: t.string,
                            value: t.number,
                        }))
                    }));

                    const COINBASE_TYPE = t.exact(t.type({
                        type: t.string,
                        height: t.number,
                        outputs: t.array(t.type({
                            pubkey: t.string,
                            value: t.number,
                        }))
                    }));

                    if (BLOCK_TYPE.decode(parsed_json['object']._tag === "Right") && parsed_json['type'] == 'block') {
                        result = MESSAGE_TYPES.BLOCK_RECEIVED;
                    } else if (TRANSACTION_TYPE.decode(parsed_json['object']._tag === "Right") && parsed_json['type'] == 'transaction') {
                        let valid_transaction: Boolean = true;

                        for (const input of parsed_json["input"]) {
                            const outpoint = input['outpoint']
                            if (!_is_hex(input['sig']) || input['sig'].length != 128 || outpoint['index'] < 0) {
                                valid_transaction = false;
                            }
                        }

                        for (const output of parsed_json["output"]) {
                            if (!_is_hex(output['pubkey']) || output['pubkey'].length != 64 || output['value'] < 0) {
                                valid_transaction = false;
                            }
                        }

                        if (valid_transaction) {
                            result = MESSAGE_TYPES.TRANSACTION_RECEIVED;
                        } else {
                            result = INVALID_TYPES.INVALID_FORMAT;
                        }

                    } else if (COINBASE_TYPE.decode(parsed_json['object']._tag === "Right") && parsed_json['type'] == 'transaction') {
                        result = MESSAGE_TYPES.COINBASE_RECEIVED;
                    } else {
                        result = INVALID_TYPES.INVALID_FORMAT;
                    }

                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "ihaveobject":
                const HAS_OBJECT_TYPE = t.exact(t.type({
                    type: t.string,
                    objectid: t.string,
                }));
                if (HAS_OBJECT_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.HAS_OBJECT);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "error":
                const ERROR_TYPE = t.exact(t.type({
                    type: t.string,
                    name: t.string,
                }));
                if (ERROR_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.ERROR_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
        }
    } catch (err) {
        result = INVALID_TYPES.INVALID_FORMAT;
    }

    return result;

}

