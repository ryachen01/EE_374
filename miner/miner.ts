import * as ed from "@noble/ed25519";
import { LightNode } from "../tests/light_node";
import { _hash_object, make_coinbase_tx, hexToBytes, sleep } from '../utils'

var current_block = '';

function mine_block(block: any): any {
    const difficulty: string = block['T'];
    let block_hash: string = 'f';
    let nonce: number = 0;
    let starting_nonce: string = (Math.floor(Math.random() * 100) ** 32).toString(16);
    let hex_nonce: string = ''

    const start_time: number = Math.round(Date.now() / 1000);

    while (block_hash > difficulty) {
        nonce += 1;
        hex_nonce = nonce.toString(16) + starting_nonce;
        const padding = '0'.repeat(64 - hex_nonce.length);
        hex_nonce = padding + hex_nonce;
        block['nonce'] = hex_nonce;
        block_hash = _hash_object(block);

        if (nonce > 1000000) {
            break;
        }
    }

    const end_time: number = Math.round(Date.now() / 1000);

    console.log(`Hash Rate: ${nonce / (end_time - start_time)} hashes per second`);

    const padding = '0'.repeat(64 - hex_nonce.length);
    hex_nonce = padding + hex_nonce;
    block['nonce'] = hex_nonce;

    return block;
}

function get_chaintip(node: LightNode) {
    const json_message = {
        "type": "getchaintip",
    }
    node._write(json_message);
    node._client.on('data', async (data: string) => {
        const messages = data.toString().split("\n");
        for (const message of messages) {
            if (message.includes("chaintip") && message.includes("blockid")) {
                current_block = (JSON.parse(message)["blockid"]);
                return current_block
            }
        }
    });
}

async function start_miner(node: LightNode) {
    const private_key = hexToBytes("29ec22ed56c94afc0207d421d3651325", 'utf8');
    const coinbase_tx = await make_coinbase_tx(private_key, 5000000000, 1);
    const coinbase_id = _hash_object(coinbase_tx);
    const cur_time: number = Math.round(Date.now() / 1000)

    const block = {
        "T": "00000000abc00000000000000000000000000000000000000000000000000000",
        "created": cur_time,
        "miner": "Best Miner",
        "nonce": "",
        "previd": current_block,
        "txids": [coinbase_id],
        "type": "block",
        "studentids": ["rcheng07", "cantillon"]
    }

    let mined_block = mine_block(block);
    console.log(mined_block);
    const object_message: any = {
        type: "object",
        object: mined_block,
    };

    node._write(object_message);

}


async function main() {
    const miner = new LightNode('135.181.112.99');
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    miner._write(hello_message);
    get_chaintip(miner);
    await (sleep(2000));
    await start_miner(miner);

}

main();