import { LightNode } from "../tests/light_node";
import { _hash_object, make_coinbase_tx, hexToBytes, sleep } from '../utils'
import { canonicalize } from "json-canonicalize";
import level from "level-ts";
import fs from "fs";

var current_block = '';
var current_length = -1;

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

async function update_miner(node: LightNode) {
    const db = new level("./database");
    const private_key = hexToBytes("...", 'utf8');
    const coinbase_tx = await make_coinbase_tx(private_key, 50000000000000, current_length);
    node._write({ "type": "object", "object": coinbase_tx });
    const coinbase_id = _hash_object(coinbase_tx);
    const cur_time: number = Math.round(Date.now() / 1000)

    const block = {
        "T": "00000000abc00000000000000000000000000000000000000000000000000000",
        "created": cur_time,
        "miner": "Best Miner",
        "nonce": "0000000000000000000000000000000000000000000000000000000000000000",
        "previd": current_block,
        "txids": [coinbase_id],
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
                current_block = (JSON.parse(message)["blockid"]);
            } else if (message.includes("chainlength") && message.includes("length")) {
                current_length = (JSON.parse(message)["length"]);
            }
        }
    });
    miner._client.on('close', () => {
        return main();
    })

    while (true) {
        get_chaintip(miner);
        get_chainlength(miner);
        await (sleep(5000));
        await update_miner(miner);
    }
}

main();
