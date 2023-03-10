
import * as ed from "@noble/ed25519";
import level from "level-ts";
import { EventEmitter } from "events";
import { canonicalize } from "json-canonicalize";
import { INVALID_TYPES, MESSAGE_TYPES, UTXO } from "./types";
import { parse_object, _hash_object } from './utils'
import { SocketHandler } from './socket_handler'


function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

        let signatures: string[] = [];
        for (const input of inputs) {
            const sig: string = input["sig"];
            if (sig == null) {
                return false;
            }
            input["sig"] = null;
            signatures.push(sig);
        }

        for (let idx = 0; idx < inputs.length; idx++) {

            const message: string = canonicalize(object_json);

            const tx_idx: number = object_json["inputs"][idx]["outpoint"]["index"];
            const input_id = object_json["inputs"][idx]["outpoint"]["txid"];
            const input_tx = await db.get(input_id);

            const pubkey = input_tx["outputs"][tx_idx]["pubkey"];
            const is_valid = await ed.verify(
                hexToBytes(signatures[idx], "hex"),
                hexToBytes(message, "utf8"),
                hexToBytes(pubkey, "hex")
            );
            if (!is_valid) {
                return false;
            }
        }
        return true;
    } catch (err) {
        console.error(err);
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
        console.error(err);
        return false;
    }
}

async function _check_no_double_spend(object: string): Promise<Boolean> {
    try {
        let input_map: any = {};
        const object_json = JSON.parse(object)['object'];
        const inputs = object_json["inputs"];
        for (const input of inputs) {
            const tx_id = input["outpoint"]["txid"];
            const tx_index = input["outpoint"]["index"];
            if (!input_map[tx_id]) {
                input_map[tx_id] = [tx_index];
            } else {
                if (!(tx_index in input_map)) {
                    input_map[tx_id].append(tx_index);
                } else {
                    return false;
                }
            }
        }
        return true;
    } catch (err) {
        console.error(err);
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

        const valid_no_double_spend = await _check_no_double_spend(object);
        if (!valid_no_double_spend) {
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
        const object_json = JSON.parse(object)['object'];
        const object_hash = _hash_object(object_json);
        const object_t = object_json['T'];

        return object_hash < object_t;
    }

    catch (err) {
        console.error(err);
        return false;
    }
}

async function _check_txids(object: string, emitter: EventEmitter, retry_count: number = 0): Promise<Boolean> {
    const db = new level("./database");
    if (retry_count == 10) {
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

        await sleep(300);
        return _check_txids(object, emitter, retry_count + 1);

    } catch (err) {
        console.error(err);
        return false;
    }
}

async function _valid_coinbase_height(object_json: any, height: number): Promise<Boolean> {
    if (height <= 0) {
        return false;
    }
    const db = new level("./database");
    try {
        const parent_block_hash = object_json['previd'];
        if (parent_block_hash == "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2") {
            return height == 1;
        } else {
            const parent_block = await db.get(parent_block_hash);
            return _valid_coinbase_height(parent_block, height - 1);
        }

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
            if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED && i != 0) {
                return false;
            } else if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED && i == 0) {
                const coinbase_height = transaction['height'];
                if (!(await _valid_coinbase_height(object_json, coinbase_height))) {
                    return false;
                }
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
            if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED) {
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

async function _check_coinbase_conservation(object: string): Promise<Boolean> {
    const db = new level("./database");
    try {
        const reward: number = 50 * 10 ** 12;
        let transaction_fees: number = 0;
        let coinbase_amount: number = 0;
        const object_json = JSON.parse(object)['object'];
        const tx_ids = object_json['txids'];
        for (const tx_id of tx_ids) {
            const transaction = await db.get(tx_id);
            const transaction_type = parse_object(transaction);
            if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED) {
                coinbase_amount = transaction['outputs'][0]['value'];
            } else {
                let tx_input_amount: number = 0;
                let tx_output_amount: number = 0;
                for (const output of transaction['outputs']) {
                    tx_output_amount += output['value'];
                }
                for (const input of transaction['inputs']) {
                    const input_tx = await db.get(input['outpoint']['txid']);
                    const input_idx = input['outpoint']['index'];
                    tx_input_amount += input_tx['outputs'][input_idx]['value'];
                }
                let tx_fee = tx_input_amount - tx_output_amount;
                transaction_fees += tx_fee;
            }
        }
        return coinbase_amount <= transaction_fees + reward;
    } catch (err) {
        console.error(err);
        return false;
    }
}

async function _validate_utxo_set(object: string): Promise<Boolean> {
    const object_db = new level("./database");
    const utxo_db = new level("./utxos");

    try {
        const object_json = JSON.parse(object)['object'];
        const block_hash = _hash_object(object_json);
        const tx_ids = object_json['txids'];
        let utxo_set: UTXO[];
        if (block_hash == '0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2') {
            utxo_set = [];
        } else {
            utxo_set = await utxo_db.get(object_json['previd']);
        }

        for (const tx_id of tx_ids) {
            const transaction = await object_db.get(tx_id);
            const transaction_type = parse_object(transaction);
            if (transaction_type == MESSAGE_TYPES.COINBASE_RECEIVED) {
                for (let i = 0; i < transaction['outputs'].length; i++) {
                    utxo_set.push({ outpoint_id: tx_id, idx: i });
                }
            } else {
                for (const input of transaction['inputs']) {
                    const outpoint = input['outpoint'];
                    const outpoint_txid = outpoint['txid'];
                    const outpoint_idx = outpoint['index'];
                    let found_utxo: Boolean = false;
                    for (let i = 0; i < utxo_set.length; i++) {
                        if (utxo_set[i].outpoint_id == outpoint_txid && utxo_set[i].idx == outpoint_idx) {
                            utxo_set.splice(i, 1);
                            i--;
                            found_utxo = true;
                        }
                    }
                    if (!found_utxo) {
                        return false;
                    }
                }
                for (let i = 0; i < transaction['outputs'].length; i++) {
                    utxo_set.push({ outpoint_id: tx_id, idx: i });
                }
            }
        }

        console.log("saving utxo set");
        console.log(block_hash, utxo_set);
        utxo_db.put(block_hash, utxo_set);
        return true;

    } catch (err) {
        console.error(err);
        return false;
    }
}

// async function _check_parent_block(object: string, emitter: EventEmitter, retry_count: number = 0): Promise<Boolean> {
//     const db = new level("./database");
//     if (retry_count == 10) {
//         return false;
//     }
//     try {
//         const object_json = JSON.parse(object)['object'];
//         const block_hash = _hash_object(object_json);
//         if (block_hash == '0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2') {
//             return true;
//         }
//         const parent_hash = object_json['previd'];
//         if (!parent_hash) {
//             return false;
//         }
//         if (await db.exists(parent_hash)) {
//             return true;
//         } else {
//             if (retry_count == 0) {
//                 emitter.emit("unknownObjects", [parent_hash]); // because everything is recursive we end up spamming nodes with requests if we're missing even 1 block
//             }
//             await sleep(300);
//             return _check_parent_block(object, emitter, retry_count + 1);
//         }
//     } catch (err) {
//         console.error(err);
//         return false;
//     }
// }

async function _check_timestamp(object: string): Promise<Boolean> {
    const db = new level("./database");
    try {
        const cur_time: number = Date.now() / 1000
        const object_json = JSON.parse(object)['object'];
        const block_timestamp = object_json['created']
        const parent_hash = object_json['previd'];
        if (!parent_hash) {
            return block_timestamp < cur_time;
        }
        const parent_block = await db.get(parent_hash);
        const parent_timestamp = parent_block['created']
        return block_timestamp > parent_timestamp && block_timestamp < cur_time
    } catch (err) {
        console.error(err);
        return false;
    }
}


export async function validate_block(object: string, handler: SocketHandler): Promise<void | INVALID_TYPES> {

    const valid_pow = _check_pow(object);
    if (!valid_pow) {
        return INVALID_TYPES.INVALID_BLOCK_POW;
    }

    const valid_parent = await handler._check_parent_block(object);

    // const valid_parent = await _check_parent_block(object, emitter);

    const valid_timestamp = await _check_timestamp(object);
    if (!valid_timestamp) {
        return INVALID_TYPES.INVALID_BLOCK_TIMESTAMP;
    }

    if (!valid_parent) {
        return INVALID_TYPES.UNFINDABLE_OBJECT;
    }

    const valid_txids = await _check_txids(object, handler._event_emitter);
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

    const valid_coinbase_conservation = await _check_coinbase_conservation(object);
    if (!valid_coinbase_conservation) {
        return INVALID_TYPES.INVALID_BLOCK_COINBASE;
    }

    const valid_utxo_set = await _validate_utxo_set(object);
    if (!valid_utxo_set) {
        return INVALID_TYPES.INVALID_TX_OUTPOINT;
    }

}
