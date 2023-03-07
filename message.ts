import { z } from "zod";
import { MESSAGE_TYPES, INVALID_TYPES } from './types';
import { parse_object } from './utils'

export function parse_message(received_message: string): MESSAGE_TYPES | INVALID_TYPES {

    let result: MESSAGE_TYPES | INVALID_TYPES = INVALID_TYPES.INVALID_MESSAGE;

    try {
        let parsed_json = JSON.parse(received_message);
        switch (parsed_json["type"]) {
            case "hello":

                const HELLO_TYPE = z.object({
                    type: z.literal("hello"),
                    version: z.string(),
                    agent: z.string(),
                });


                if (HELLO_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.HELLO_RECEIVED);
                    if (parsed_json["version"].slice(0, -1) != "0.9.") {
                        result = INVALID_TYPES.INVALID_FORMAT;
                    }
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }

                break;
            case "getpeers":
                const PEERS_REQUEST_TYPE = z.object({
                    type: z.literal("getpeers"),
                });
                if (PEERS_REQUEST_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.PEERS_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getchaintip":
                const CHAINTIP_REQUEST_TYPE = z.object({
                    type: z.literal("getchaintip"),
                });
                if (CHAINTIP_REQUEST_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.CHAINTIP_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getchainlength":
                const CHAINLENGTH_REQUEST_TYPE = z.object({
                    type: z.literal("getchainlength"),
                });
                if (CHAINLENGTH_REQUEST_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.CHAINLENGTH_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getmempool":
                const MEMPOOL_REQUEST_TYPE = z.object({
                    type: z.literal("getmempool"),
                });
                if (MEMPOOL_REQUEST_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.MEMPOOL_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "getobject":
                const OBJECT_REQUEST_TYPE = z.object({
                    type: z.literal("getobject"),
                    objectid: z.string()
                });
                if (OBJECT_REQUEST_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.OBJECT_REQUEST);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "peers":
                const PEERS_RECEIVED_TYPE = z.object({
                    type: z.literal("peers"),
                    peers: z.array(z.string()),
                });
                if (PEERS_RECEIVED_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.PEERS_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "chaintip":
                const CHAINTIP_RECEIVED_TYPE = z.object({
                    type: z.literal("chaintip"),
                    blockid: z.string(),
                });
                if (CHAINTIP_RECEIVED_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.CHAINTIP_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "mempool":
                const MEMPOOL_RECEIVED_TYPE = z.object({
                    type: z.literal("mempool"),
                    txids: z.array(z.string()),
                });
                if (MEMPOOL_RECEIVED_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.MEMPOOL_RECEIVED);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "object":
                const OBJECT_RECEIVED_TYPE = z.object({
                    type: z.literal("object"),
                    object: z.object({})
                });
                if (OBJECT_RECEIVED_TYPE.safeParse(parsed_json).success) {
                    result = parse_object(parsed_json['object']);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }

                break;
            case "ihaveobject":
                const HAS_OBJECT_TYPE = z.object({
                    type: z.literal("ihaveobject"),
                    objectid: z.string(),
                });
                if (HAS_OBJECT_TYPE.safeParse(parsed_json).success) {
                    result = (MESSAGE_TYPES.HAS_OBJECT);
                } else {
                    result = INVALID_TYPES.INVALID_FORMAT;
                }
                break;
            case "error":
                const ERROR_TYPE = z.object({
                    type: z.literal("error"),
                    name: z.string(),
                });
                if (ERROR_TYPE.safeParse(parsed_json).success) {
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

