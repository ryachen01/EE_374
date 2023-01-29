import * as ed from "@noble/ed25519";
import { canonicalize } from "json-canonicalize";
import { LightNode } from "./light_node";
import { _hash_object } from "../validation";

function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
}

function bytesToHex(byteArray: any) {
    return Array.from(byteArray, (byte: any) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function make_coinbase_tx(private_key: any, value: number) {

    const public_key = bytesToHex(await ed.getPublicKey(private_key));

    const coinbase_tx = {
        "type": "transaction",
        "height": 0,
        "outputs": [{
            "pubkey": public_key,
            "value": value,
        }]
    }

    return coinbase_tx;

}



export async function make_tx(tx_ids: string[], indices: number[], private_keys: any[], public_keys: any[], values: number[]) {


    let tx = {
        type: "transaction",
        inputs: [{
            "outpoint": null,
            "sig": null,
        }],
        outputs: [{
            "pubkey": null,
            "value": null,
        }]
    }

    for (let i = 0; i < tx_ids.length; i++) {
        const outpoint = {
            "txid": tx_ids[i],
            "index": indices[i],
        }
        const input_object: any = {
            "outpoint": outpoint,
            "sig": null
        }
        tx['inputs'][i] = input_object
    }

    for (let i = 0; i < public_keys.length; i++) {
        tx['outputs'][i]['pubkey'] = public_keys[i];
        tx['outputs'][i]['value'] = values[i] as any;
    }


    const canonicalized_tx = canonicalize(tx);

    console.log(canonicalized_tx);

    for (let i = 0; i < private_keys.length; i++) {
        const sig: any = bytesToHex(await ed.sign(hexToBytes(canonicalized_tx, 'utf8'), private_keys[i]));
        tx['inputs'][i]['sig'] = sig;
    }

    return tx;
}

async function test_creating_tx() {
    const test_node = new LightNode();
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    test_node._write(hello_message);
    const private_key = ed.utils.randomPrivateKey();
    const coinbase_tx = await make_coinbase_tx(private_key, 5000000000);
    const coinbase_id = _hash_object(coinbase_tx);
    test_node._write({ "type": "object", "object": coinbase_tx });
    await sleep(500);

    const private_key2 = ed.utils.randomPrivateKey();
    const coinbase_tx_2 = await make_coinbase_tx(private_key2, 5000000000);
    const coinbase_id_2 = _hash_object(coinbase_tx_2);
    test_node._write({ "type": "object", "object": coinbase_tx_2 });
    await sleep(500);

    const output_private_key = ed.utils.randomPrivateKey();
    const output_public_key = bytesToHex(await ed.getPublicKey(private_key));

    const tx = await make_tx([coinbase_id, coinbase_id_2], [0, 0], [private_key, private_key2], [output_public_key], [10000]);
    test_node._write({ "type": "object", "object": tx })

}

test_creating_tx();