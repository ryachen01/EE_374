import * as ed from "@noble/ed25519";
import { LightNode } from "./light_node";
import { _hash_object } from "../validation";
import { make_coinbase_tx, make_tx, bytesToHex } from '../utils'

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function mine_block(block: any): any {
    const difficulty: string = block['T'];
    let block_hash: string = 'f';
    let nonce: number = 0;
    let hex_nonce: string = ''
    while (block_hash > difficulty) {
        nonce += 1;
        hex_nonce = nonce.toString(16);
        const padding = '0'.repeat(64 - hex_nonce.length);
        hex_nonce = padding + hex_nonce;
        block['nonce'] = hex_nonce;
        block_hash = _hash_object(block);
    }
    const padding = '0'.repeat(64 - hex_nonce.length);
    hex_nonce = padding + hex_nonce;
    block['nonce'] = hex_nonce;

    return block;
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
    test_node._write({ "type": "object", "object": coinbase_tx });
    await sleep(500);

    let block = {
        "T": "0000abc000000000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
        "txids": [coinbase_id],
        "type": "block"
    }

    block = mine_block(block);

    test_node._write({ "type": "object", "object": block });
}

async function test_valid_multiple_blocks() {
    const test_node = new LightNode();
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    test_node._write(hello_message);
    const private_key = ed.utils.randomPrivateKey();
    const coinbase_tx = await make_coinbase_tx(private_key, 50000);
    const coinbase_id = _hash_object(coinbase_tx);
    test_node._write({ "type": "object", "object": coinbase_tx });
    await sleep(500);

    const private_key2 = ed.utils.randomPrivateKey();
    const coinbase_tx_2 = await make_coinbase_tx(private_key2, 10000);
    const coinbase_id_2 = _hash_object(coinbase_tx_2);
    test_node._write({ "type": "object", "object": coinbase_tx_2 });
    await sleep(500);

    const output_private_key = ed.utils.randomPrivateKey();
    const output_public_key = bytesToHex(await ed.getPublicKey(output_private_key));
    const tx = await make_tx([coinbase_id], [0], [private_key], [output_public_key], [50000]);
    const tx_id = _hash_object(tx);
    test_node._write({ "type": "object", "object": tx });
    await sleep(500);

    const block1 = {
        "T": "0000abc000000000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
        "txids": [coinbase_id],
        "type": "block"
    }

    const block1_hash = _hash_object(block1);

    const block2 = {
        "T": "0000abc000000000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": block1_hash,
        "txids": [coinbase_id_2, tx_id],
        "type": "block"
    }

    test_node._write({ "type": "object", "object": mine_block(block1) });
    await sleep(500);
    test_node._write({ "type": "object", "object": mine_block(block2) });
}

async function test_coinbase_conservation() {
    const test_node = new LightNode();
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    test_node._write(hello_message);


    const block_reward = 50 * 10 ** 12;
    const private_key = ed.utils.randomPrivateKey();
    const coinbase_tx = await make_coinbase_tx(private_key, block_reward);
    const coinbase_id = _hash_object(coinbase_tx);
    test_node._write({ "type": "object", "object": coinbase_tx });
    await sleep(500);

    const output_private_key = ed.utils.randomPrivateKey();
    const output_public_key = bytesToHex(await ed.getPublicKey(output_private_key));
    const tx_value = 50 * 10 ** 11;
    const tx = await make_tx([coinbase_id], [0], [private_key], [output_public_key], [tx_value]);
    const tx_id = _hash_object(tx);
    test_node._write({ "type": "object", "object": tx });
    await sleep(500);

    const tx_fee = block_reward - tx_value;

    const private_key2 = ed.utils.randomPrivateKey();
    const coinbase_tx_2 = await make_coinbase_tx(private_key2, block_reward + tx_fee); // any more and the block should error
    const coinbase_id_2 = _hash_object(coinbase_tx_2);
    test_node._write({ "type": "object", "object": coinbase_tx_2 });
    await sleep(500);

    const block1 = {
        "T": "0000abc000000000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": "0000000052a0e645eca917ae1c196e0d0a4fb756747f29ef52594d68484bb5e2",
        "txids": [coinbase_id],
        "type": "block"
    }

    const block1_hash = _hash_object(block1);

    const block2 = {
        "T": "0000abc000000000000000000000000000000000000000000000000000000000",
        "created": 1671148800,
        "miner": "Test Miner",
        "nonce": "",
        "previd": block1_hash,
        "txids": [coinbase_id_2, tx_id],
        "type": "block"
    }

    test_node._write({ "type": "object", "object": mine_block(block1) });
    await sleep(500);
    test_node._write({ "type": "object", "object": mine_block(block2) });
}

test_coinbase_conservation();