import * as ed from "@noble/ed25519";
import { LightNode } from './light_node';
import { make_coinbase_tx, make_tx, bytesToHex, _hash_object } from '../utils'


function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    const coinbase_tx = await make_coinbase_tx(private_key, 10000, 0);
    const coinbase_id = _hash_object(coinbase_tx);
    test_node._write({ "type": "object", "object": coinbase_tx });
    await sleep(500);

    const private_key2 = ed.utils.randomPrivateKey();
    const coinbase_tx_2 = await make_coinbase_tx(private_key2, 10000, 0);
    const coinbase_id_2 = _hash_object(coinbase_tx_2);
    test_node._write({ "type": "object", "object": coinbase_tx_2 });
    await sleep(1500);

    const output_private_key = ed.utils.randomPrivateKey();
    const output_public_key = bytesToHex(await ed.getPublicKey(output_private_key));

    const tx = await make_tx([coinbase_id, coinbase_id_2], [0, 0], [private_key, private_key2], [output_public_key], [20000]);
    test_node._write({ "type": "object", "object": tx })

}

test_creating_tx();