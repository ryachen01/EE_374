import * as t from 'io-ts';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';

export function parse_message(received_message: string): MESSAGE_TYPES | INVALID_TYPES {

    let result: MESSAGE_TYPES | INVALID_TYPES;

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
                    result = (MESSAGE_TYPES.OBJECT_RECEIVED);
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
                    message: t.string,
                }));
                if (ERROR_TYPE.decode(parsed_json)._tag === "Right") {
                    result = (MESSAGE_TYPES.ERROR_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            default:
                result = (INVALID_TYPES.INVALID_MESSAGE);
                break;
        }
    } catch (err) {
        result = INVALID_TYPES.INVALID_FORMAT;
    }

    return result;

}

