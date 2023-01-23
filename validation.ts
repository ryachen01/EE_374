import level from 'level-ts';
import * as ed from '@noble/ed25519';
import { canonicalize } from 'json-canonicalize';

function _check_format(object: string) {
    return true;
}

async function _check_outpoint(object: string): Promise<Boolean> {
    try {
        const db = new level('./database');

        const object_json = JSON.parse(object);

        const output = object_json['output']
        const outpoint = output['outpoint']
        const tx_id = outpoint['txid']
        const idx = outpoint['idx']
        const output_size = outpoint.length
        if (await db.exists(tx_id) && idx < output_size) {
            return true
        }
    } catch (err) {
        console.log(err)
        return false;
    }

    return false;
}

function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
}


async function _verify_sig(object: string) {

    try {

        const db = new level('./database');

        const object_json = JSON.parse(object);
        const inputs = object_json['inputs']

        let tx_valid: Boolean = true;
        for (let idx = 0; idx < inputs.length; idx++) {

            const sig: string = object_json['inputs'][idx]['sig'];
            object_json['inputs'][idx]['sig'] = null // converts message object sig to null
            const message: string = canonicalize(object_json);

            const tx_idx: number = object_json['inputs'][idx]['outpoint']['index'];
            const input_id = object_json['inputs'][idx]['outpoint']['txid'];
            const has_object: Boolean = await db.exists(input_id);

            if (!has_object) {
                tx_valid = false;
                continue;
            }

            const input_tx = await db.get(input_id);

            if (tx_idx >= input_tx['outputs'].length) {
                tx_valid = false;
                continue;
            }

            const pubkey = input_tx['outputs'][tx_idx]['pubkey'];

            const is_valid = await ed.verify((hexToBytes(sig, 'hex')), (hexToBytes(message, 'utf8')), (hexToBytes(pubkey, 'hex')))
            if (!is_valid) {
                tx_valid = false;
            }
        }

        return tx_valid;

    } catch (err) {
        console.log(err)
        return false;
    }

}

function _check_output(object: string) {
    return true;
}

async function _check_conservation(object: string): Promise<Boolean> {

    const db = new level('./database');

    try {
        const object_json = JSON.parse(object);
        const inputs = object_json['inputs']
        const outputs = object_json['outputs']

        let input_sum = 0
        let output_sum = 0

        for (let input of inputs) {
            const tx_id = input['outpoint']['txid']
            const has_object: Boolean = await db.exists(tx_id);
            if (!has_object) {
                return false;
            }
            const input_tx = await db.get(tx_id);

            for (const output of input_tx['outputs']) {
                input_sum += output['value'];
            }

        }

        for (const output of outputs) {
            output_sum += output['value']
        }

        return input_sum == output_sum;

    } catch (err) {
        return false;
    }
}


export async function validate_transaction(object: string): Promise<Boolean> {

    return _verify_sig(object);
}

export function validate_coinbase(object: string): Boolean {
    return true;
}

export function validate_block(object: string): Boolean {
    return true;
}

