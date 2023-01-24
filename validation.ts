import level from "level-ts";
import * as ed from "@noble/ed25519";
import { canonicalize } from "json-canonicalize";
import { INVALID_TYPES } from "./types";

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

function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
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

export function validate_block(object: string): Boolean {
    return true; // Don't have to worry about this for now
}
