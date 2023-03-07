import { LightNode } from "../tests/light_node";
import { _hash_object, make_coinbase_tx, hexToBytes, sleep, parse_object, make_tx } from '../utils'
import { canonicalize } from "json-canonicalize";
import fs from "fs";
import { MESSAGE_TYPES } from "../types";

var current_block = '';
var current_length = -1;
var current_mempool_ids: string[] = [];
var current_mempool_txs: any[] = [];
var known_txs: Set<string> = new Set();

function get_chaintip(node: LightNode) {
    const json_message = {
        "type": "getchaintip",
    }
    node._write(json_message);
}

function get_chainlength(node: LightNode) {
    const json_message = {
        "type": "getchainlength",
    }
    node._write(json_message);
}

function get_mempool_tx_ids(node: LightNode) {
    const json_message = {
        "type": "getmempool",
    }
    node._write(json_message);
}

function get_mempool_txs(node: LightNode) {
    for (const tx_id of current_mempool_ids) {
        if (!known_txs.has(tx_id)) {
            const json_message = {
                "type": "getobject",
                "objectid": tx_id
            };
            node._write(json_message);
        }
    }

}

async function update_miner(node: LightNode) {

    const private_key = hexToBytes("97ff911097f78f53bf238c097a0f7a0b", 'utf8');
    const coinbase_tx = await make_coinbase_tx(private_key, 50000000000000, current_length);
    node._write({ "type": "object", "object": coinbase_tx });
    const coinbase_id = _hash_object(coinbase_tx);
    const cur_time: number = Math.round(Date.now() / 1000)

    let txs = [coinbase_id];

    for (const tx of current_mempool_txs) {
        if (parse_object(tx) == MESSAGE_TYPES.TRANSACTION_RECEIVED) {
            txs.push(_hash_object(tx));
        }
    }

    const block = {
        "T": "00000000abc00000000000000000000000000000000000000000000000000000",
        "created": cur_time,
        "miner": "Best Miner",
        "nonce": "0000000000000000000000000000000000000000000000000000000000000000",
        "previd": current_block,
        "txids": txs,
        "type": "block",
        "studentids": ["rcheng07", "mcan"]
    }

    fs.writeFile("target.txt", canonicalize(block), (err) => {
        if (err) {
            console.error(err);
            return;
        }
    });


    fs.readFile("mined_block.txt", "utf-8", async (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        const mined_block = JSON.parse(data);
        const object_message: any = {
            type: "object",
            object: mined_block,
        };

        node._write(object_message);


    });

}

async function pay_grader(node: LightNode, input_tx: string) {

    const private_key = hexToBytes("97ff911097f78f53bf238c097a0f7a0b", 'utf8');
    const tx = await make_tx([input_tx], [0], [private_key], ["3f0bc71a375b574e4bda3ddf502fe1afd99aa020bf6049adfe525d9ad18ff33f"], [50000000000000]);
    console.log(canonicalize(tx));
}

async function main() {
    let miner = new LightNode('135.181.112.99');
    const hello_message: any = {
        type: "hello",
        version: "0.9.0",
        agent: "Marabu Test Client",
    };
    miner._write(hello_message);
    miner._client.on('data', async (data: string) => {
        const messages = data.toString().split("\n");
        for (const message of messages) {
            if (message.includes("chaintip") && message.includes("blockid")) {
                const new_block = JSON.parse(message)["blockid"];
                if (new_block != current_block) {
                    current_block = new_block;
                    current_mempool_txs = [];
                }
            } else if (message.includes("chainlength") && message.includes("length")) {
                current_length = JSON.parse(message)["length"];
            } else if (message.includes("mempool") && message.includes("txids")) {
                current_mempool_ids = JSON.parse(message)["txids"];
            } else if (message.includes("object") && message.includes("\"type\":\"transaction\"")) {
                const received_tx = JSON.parse(message)['object'];
                current_mempool_txs.push(received_tx);
                known_txs.add(_hash_object(received_tx));
            }
        }
    });
    miner._client.on('close', () => {
        return main();
    })

    // pay_grader(miner, "2bf40e9a7f0aef6ac759f81c9521a23d70dd07bdafa4234d2cc0dca1cf30222f");

    while (true) {
        get_chaintip(miner);
        get_chainlength(miner);
        get_mempool_tx_ids(miner);
        await (sleep(300));
        get_mempool_txs(miner);
        await (sleep(5000));
        await update_miner(miner);
    }
}

main();
