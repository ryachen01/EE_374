import * as ed from "@noble/ed25519";
import { LightNode } from "./light_node";
import { _hash_object } from "../validation";
import { make_coinbase_tx, make_tx, bytesToHex } from '../utils'

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function mine_block(block: any): number {
    const difficulty: string = block['T'];
    let block_hash: string = 'f';
    let nonce: number = 0;
    while (block_hash > difficulty) {
        nonce += 1;
        let hex_nonce: string = nonce.toString(16);
        const padding = '0'.repeat(64 - hex_nonce.length);
        hex_nonce = padding + hex_nonce;
        block['nonce'] = hex_nonce;
        block_hash = _hash_object(block);
    }
    return nonce;
}

async function test_valid_block() {
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
    // test_node._write({ "type": "object", "object": coinbase_tx });
    // await sleep(500);

    const block = {
        "T": "00000000abc00000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
        "txids": [coinbase_id],
        "type": "block"
    }

    console.log(mine_block(block));
}

test_valid_block();