import * as blake2 from 'blake2';
import * as t from 'io-ts';
import * as ed from "@noble/ed25519";
import level from "level-ts";
import { EventEmitter } from "events";
import { canonicalize } from "json-canonicalize";
import { parse_object } from './message';
import { INVALID_TYPES, OBJECT_TYPES } from "./types";


function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function _hash_object(object: string): string {
    const blake_hash = blake2.createHash('blake2s');
    const json_object = JSON.parse(object)["object"];
    const canonicalized_json = canonicalize(json_object)
    const hash_input = Buffer.from(canonicalized_json);
    blake_hash.update(hash_input);
    const hash_output = blake_hash.digest("hex");

    return hash_output;
}

async function _check_outpoint_objects(object: string): Promise<Boolean> {
    try {
        const db = new level("./database");
        const object_json = JSON.parse(object)['object'];
        const inputs = object_json["inputs"];

        for (const input of inputs) {
            const tx_id = input["outpoint"]["txid"];
            if (!await db.exists(tx_id)) {
                return false;
            }
        }

        return true;

    } catch (err) {
        console.error(err);
        return false;
    }

}

async function _check_outpoint_indices(object: string): Promise<Boolean> {
    try {
        const db = new level("./database");
        const object_json = JSON.parse(object)['object'];
        const inputs = object_json["inputs"];

        for (const input of inputs) {
            const tx_id = input["outpoint"]["txid"];
            const outpoint_idx = input["outpoint"]["index"];
            const outpoint_obj = await db.get(tx_id);
            if (outpoint_idx >= outpoint_obj['outputs'].length) {
                return false;
            }
        }

        return true;

    } catch (err) {
        console.error(err);
        return false;
    }

}

async function _verify_sig(object: string): Promise<Boolean> {
    try {
        const db = new level("./database");

        const object_json = JSON.parse(object)['object'];
        const inputs = object_json["inputs"];

        for (let idx = 0; idx < inputs.length; idx++) {
            const sig: string = object_json["inputs"][idx]["sig"];
            if (sig == null) {
                return false;
            }
            object_json["inputs"][idx]["sig"] = null; // converts message object sig to null
            const message: string = canonicalize(object_json);

            const tx_idx: number = object_json["inputs"][idx]["outpoint"]["index"];
            const input_id = object_json["inputs"][idx]["outpoint"]["txid"];
            const input_tx = await db.get(input_id);

            const pubkey = input_tx["outputs"][tx_idx]["pubkey"];
            const is_valid = await ed.verify(
                hexToBytes(sig, "hex"),
                hexToBytes(message, "utf8"),
                hexToBytes(pubkey, "hex")
            );
            if (!is_valid) {
                return false;
            }
        }
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

async function _check_conservation(object: string): Promise<Boolean> {
    const db = new level("./database");

    try {
        const object_json = JSON.parse(object)['object'];
        const inputs = object_json["inputs"];
        const outputs = object_json["outputs"];

        let input_sum = 0;
        let output_sum = 0;

        for (const input of inputs) {
            const tx_id = input["outpoint"]["txid"];
            const input_tx = await db.get(tx_id);

            for (const output of input_tx["outputs"]) {
                input_sum += output["value"];
            }
        }

        for (const output of outputs) {
            output_sum += output["value"];
        }


        return input_sum >= output_sum;
    } catch (err) {
        console.log(err);
        return false;
    }
}

export async function validate_transaction(object: string): Promise<void | INVALID_TYPES> {
    try {
        const valid_outpoint_objects = await _check_outpoint_objects(object);
        if (!valid_outpoint_objects) {
            return INVALID_TYPES.UNKNOWN_OBJECT;
        }

        const valid_outpoint_indices = await _check_outpoint_indices(object);
        if (!valid_outpoint_indices) {
            return INVALID_TYPES.INVALID_TX_OUTPOINT;
        }

        const conserved = await _check_conservation(object);
        if (!conserved) {
            return INVALID_TYPES.INVALID_TX_CONSERVATION;
        }

        const valid_sig = await _verify_sig(object);
        if (!valid_sig) {
            return INVALID_TYPES.INVALID_TX_SIGNATURE;
        }

    } catch (err) {
        console.error(err);
        return INVALID_TYPES.INVALID_FORMAT;
    }
}

export function validate_coinbase(object: string): Boolean {
    return true; // Don't have to worry about this for now
}

function _check_pow(object: string): Boolean {
    try {
        const object_hash = _hash_object(object);
        const object_json = JSON.parse(object)['object'];
        const object_t = object_json['T'];

        return object_hash < object_t;
    }

    catch (err) {
        console.error(err);
        return false;
    }
}

async function _check_txids(object: string, emitter: EventEmitter, retry_count: number): Promise<Boolean> {
    const db = new level("./database");
    if (retry_count == 3) {
        return false;
    }
    try {
        const object_json = JSON.parse(object)['object'];
        const tx_ids = object_json['txids'];
        let unknown_tx_ids: string[] = []
        for (const tx_id of tx_ids) {
            if (!await db.exists(tx_id)) {
                unknown_tx_ids.push(tx_id);
            }
        }
        if (unknown_tx_ids.length == 0) {
            return true;
        }

        emitter.emit("unknownObjects", unknown_tx_ids);
        await sleep(500);

        return _check_txids(object, emitter, retry_count + 1);

    } catch (err) {
        console.error(err);
        return false;
    }
}

async function _check_coinbase(object: string): Promise<Boolean> {
    const db = new level("./database");
    try {
        const object_json = JSON.parse(object)['object'];
        const tx_ids = object_json['txids'];
        for (let i = 0; i < tx_ids.length; i++) {
            const transaction = await db.get(tx_ids[i]);
            const transaction_type = parse_object(transaction);
            if (transaction_type == OBJECT_TYPES.COINBASE_TYPE && i != 0) {
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function _check_coinbase_spend(object: string): Promise<Boolean> {
    const db = new level("./database");
    try {
        const object_json = JSON.parse(object)['object'];
        const tx_ids = object_json['txids'];
        let coinbase_id: string = '';
        for (const tx_id of tx_ids) {
            const transaction = await db.get(tx_id);
            const transaction_type = parse_object(transaction);
            if (transaction_type == OBJECT_TYPES.COINBASE_TYPE) {
                coinbase_id = tx_id;
            } else {
                const tx_inputs = transaction['inputs'];
                for (const tx_input of tx_inputs) {
                    const tx_outpoint = tx_input['outpoint'];
                    const outpoint_id = tx_outpoint['txid'];
                    if (outpoint_id == coinbase_id) {
                        return false;
                    }
                }
            }
        }
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
}

export async function validate_block(object: string, emitter: EventEmitter): Promise<void | INVALID_TYPES> {
    const valid_pow = _check_pow(object);
    if (!valid_pow) {
        return INVALID_TYPES.INVALID_BLOCK_POW;
    }
    const valid_txids = await _check_txids(object, emitter, 0);
    if (!valid_txids) {
        return INVALID_TYPES.UNFINDABLE_OBJECT;
    }

    const valid_coinbase = await _check_coinbase(object);
    if (!valid_coinbase) {
        return INVALID_TYPES.INVALID_BLOCK_COINBASE;
    }

    const valid_coinbase_spend = await _check_coinbase_spend(object);
    if (!valid_coinbase_spend) {
        return INVALID_TYPES.INVALID_TX_OUTPOINT;
    }


}
