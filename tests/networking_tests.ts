import { LightNode } from './light_node';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const port: number = 18018;
const ip_address: string = "127.0.0.1";

// invalid connection error
async function test_connection() {
    const test_node = new LightNode();
    test_node._client.connect(port, ip_address, () => {});
    await sleep(1000);

    if (test_node._client.connecting == false) {
        let json_message: any = {
            "type": "Connected to Node",
        };
        test_node._write(json_message);
    }
}

async function test_hello() {
    const test_node = new LightNode();
    // FILL THIS IN
}

async function test_reconnection() {
    const test_node = new LightNode();
    test_node._client.destroy();
    test_node._client.connect(port, ip_address, () => {});

    if (test_node._client.connecting == false) {
        let json_message: any = {
            "type": "Connected to Node",
        };
        test_node._write(json_message);
    }
}

function test_segmented_message() {
    const test_node = new LightNode();
    test_node._client.connect(port, ip_address, () => {});
    test_node._client.write("{\"type\":\"ge\"}");
    setTimeout(() => {
        test_node._client.write(", \"tpeers\"}");
    }, 100);

    test_node._client.on('data', (data: string) => {
        const received_message = JSON.parse(data.toString());
        if (received_message.type == "getpeers" && Array.isArray(received_message.peers)) {
            let json_message: any = {
                "type": "Sucess on Segmented Message"
            };
            test_node._write(json_message);
        }
    });
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
        "agent": "Marabu Test Client"
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

    await test_connection();
    await sleep(1000);
    console.log("\n---------------------------- \n");
    await test_reconnection();
    await sleep(1000);
    console.log("\n---------------------------- \n");
    await test_segmented_message();
    await sleep(1000);

    // await test_handshake();
    // await sleep(1000);
    // console.log("\n---------------------------- \n");
    // await test_buffer();
    // await sleep(1500);
    // console.log("\n---------------------------- \n");
    // await test_buffer_timeout();


}

run_tests();