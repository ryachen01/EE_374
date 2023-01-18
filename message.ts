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
                result = (INVALID_TYPES.INVALID_MESSAGE);
                break;
        }
    } catch (err) {
        result = INVALID_TYPES.INVALID_FORMAT;
    }

    return result;

}

