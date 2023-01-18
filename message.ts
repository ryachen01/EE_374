import { canonicalize } from 'json-canonicalize';
import { MESSAGE_TYPES, INVALID_TYPES } from './types';

export function parse_message(received_message: string): MESSAGE_TYPES | INVALID_TYPES {

    let result: MESSAGE_TYPES | INVALID_TYPES;

    try {

        let parsed_json = JSON.parse(received_message);
        switch (parsed_json["type"]) {
            case "hello":
                result = (MESSAGE_TYPES.HELLO_RECEIVED);
                break;
            case "getpeers":
                result = (MESSAGE_TYPES.PEERS_REQUEST);
                break;
            case "getchaintip":
                result = (MESSAGE_TYPES.CHAINTIP_REQUEST);
                break;
            case "getmempool":
                result = (MESSAGE_TYPES.MEMPOOL_REQUEST);
                break;
            case "getobject":
                result = (MESSAGE_TYPES.OBJECT_REQUEST);
                break;
            case "peers":
                result = (MESSAGE_TYPES.PEERS_RECEIVED);
                break;
            case "chaintip":
                result = (MESSAGE_TYPES.CHAINTIP_RECEIVED);
                break;
            case "mempool":
                result = (MESSAGE_TYPES.MEMPOOL_RECEIVED);
                break;
            case "object":
                result = (MESSAGE_TYPES.OBJECT_RECEIVED);
                break;
            case "ihaveobject":
                result = (MESSAGE_TYPES.HAS_OBJECT);
                break;
            case "error":
                result = (MESSAGE_TYPES.NO_MESSAGE);
                break;
            default:
                result = (INVALID_TYPES.INTERNAL_ERROR);
                break;
        }
    } catch (err) {
        result = INVALID_TYPES.INVALID_FORMAT;
    }

    return result;

}

export function prepare_message(message_type: MESSAGE_TYPES | INVALID_TYPES): string {
    let json_message: any;

    switch (message_type) {
        case MESSAGE_TYPES.HELLO_RECEIVED:
            break;
        case MESSAGE_TYPES.SEND_HELLO:
            json_message = {
                "type": "hello",
                "version": "0.9.0",
                "agent": "Marabu-Core Client 0.9"
            }
            break;
        case MESSAGE_TYPES.PEERS_REQUEST:
            json_message = {
                "type": "peers",
                "peers": [],
            }
            break;
        case MESSAGE_TYPES.PEERS_RECEIVED:
            break;
        case MESSAGE_TYPES.REQUEST_PEERS:
            json_message = {
                "type": "getpeers",
            }
            break;
        case MESSAGE_TYPES.MEMPOOL_REQUEST:
            json_message = {
                "type": "mempool",
                "txids": [],
            }
            break;
        case MESSAGE_TYPES.MEMPOOL_RECEIVED:
            break;
        case MESSAGE_TYPES.REQUEST_MEMPOOL:
            json_message = {
                "type": "getmempool",
            }
            break;
        case MESSAGE_TYPES.CHAINTIP_REQUEST:
            json_message = {
                "type": "chaintip",
                "blockid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8"
            }
            break;
        case MESSAGE_TYPES.CHAINTIP_RECEIVED:
            break;
        case MESSAGE_TYPES.REQUEST_CHAINTIP:
            json_message = {
                "type": "getchaintip",
            }
            break;
        case MESSAGE_TYPES.OBJECT_REQUEST:
            json_message = {
                "type": "object",
                "object": {
                    "T": "00000000abc00000000000000000000000000000000000000000000000000000",
                    "created": 1671062400,
                    "miner": "Marabu",
                    "nonce": "000000000000000000000000000000000000000000000000000000021bea03ed",
                    "note": "The New York Times 2022-12-13: Scientists Achieve Nuclear Fusion Breakthrough With Blast of 192 Lasers",
                    "previd": null,
                    "txids": [],
                    "type": "block"
                }
            }
            break;
        case MESSAGE_TYPES.OBJECT_RECEIVED:
            break;
        case MESSAGE_TYPES.REQUEST_OBJECT:
            json_message = {
                "type": "getobject",
                "objectid": "0024839ec9632d382486ba7aac7e0bda3b4bda1d4bd79be9ae78e7e1e813ddd8",
            }
            break;
        case MESSAGE_TYPES.HAS_OBJECT:
            break;
        case MESSAGE_TYPES.NO_MESSAGE:
            break;
        case INVALID_TYPES.INVALID_FORMAT:
            json_message =
            {
                "type": "error",
                "name": "INVALID_FORMAT",
                "description": "The format of the received message is invalid."
            };
            break;
        case INVALID_TYPES.INVALID_HANDSHAKE:
            json_message =
            {
                "type": "error",
                "name": "INVALID_FORMAT",
                "description": "The peer sent other validly formatted messages before sending a valid hello message."
            };
            break;
    }

    let canonicalized_output: string = canonicalize(json_message);
    return canonicalized_output;
}