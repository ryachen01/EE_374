import { LightNode } from './light_node';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// invalid handshake error
async function test_handshake() {

    const test_node = new LightNode();
    let json_message: any = {
        "type": "getpeers"
    };
    test_node._write(json_message);
}

// segmented message (no timeout)
async function test_buffer() {

    const test_node = new LightNode();
    let json_message: any = {
        "type": "hello",
        "version": "0.9.0",
        "agent": "Marabu Test Client"
    };
    test_node._write(json_message);
    const peer_message: string = `{"type": "getpeers"}\n`;

    for (let i = 0; i < peer_message.length; i++) {
        const char: string = peer_message.charAt(i);
        console.log(char);
        await sleep(100);
        test_node._client.write(char);
    }
}

// segmented message (timeout)
async function test_buffer_timeout() {

    const test_node = new LightNode();
    let json_message: any = {
        "type": "hello",
        "version": "0.9.0",
        "agent": "Marabu Test Client",

    };
    test_node._write(json_message);
    const peer_message: string = `{"type": "getpeers"}\n`;

    let [peer_message_0, peer_message_1] = peer_message.split(" ");
    test_node._client.write(peer_message_0);
    await sleep(7500);
    if (!test_node._client.destroyed) {
        test_node._client.write(peer_message_1);
    }
}

async function run_tests() {
    await test_handshake();
    await sleep(1000);
    console.log("\n---------------------------- \n");
    await test_buffer();
    await sleep(1500);
    console.log("\n---------------------------- \n");
    await test_buffer_timeout();
}

run_tests();