import * as fs from "fs";
import { LightNode } from "./light_node";
import peers_json from "../peers.json";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const port: number = 18018;
const ip_address: string = "127.0.0.1";

function _update_json_list(json_path: string, new_json: any): void {
  try {
    fs.writeFileSync(json_path, JSON.stringify(new_json));
  } catch (err) {
    console.error(err);
  }
}

// Connecting to Node ✅, Should receive a hello message upon connecting ✅, Get peers request after hello message ✅
async function test_connection() {
  const test_node = new LightNode();
  // Should see something like this:

  // ::ffff:127.0.0.1:59377
  // Sent: {"agent":"Marabu-Core Client 0.9","type":"hello","version":"0.9.0"}
  // Sent: {"type":"getpeers"}
}

// 4. Can disconnect then reconnect ✅
async function test_reconnection() {
  const test_node = new LightNode();
  await sleep(3000);
  test_node._client.destroy();
  await sleep(3000);
  test_node._client.connect(port, ip_address, () => { });

  // let json_message: any = {
  //     "type": "hello",
  //     "version": "0.9.0",
  //     "agent": "Marabu Test Client"
  // };
  // test_node._write(json_message);
}

// 5. Get peers request return valid peers ✅
async function test_valid_get_peers() {
  const test_node = new LightNode();

  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(json_message);

  let json2_message: any = {
    type: "getpeers",
  };

  test_node._write(json2_message);
}

// 6. Get peers segmented message return valid peers ✅
function test_segmented_message() {
  const test_node = new LightNode();
  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(json_message);
  // test_node._client.connect(port, ip_address, () => {});
  test_node._client.write('{"type":"ge');
  setTimeout(() => {
    test_node._client.write(`tpeers"}\n`);
  }, 100);
}

// 7. Get peers before hello should be invalid handshake ✅
async function test_handshake() {
  const test_node = new LightNode();
  const json_message: any = {
    type: "getpeers",
  };
  test_node._write(json_message);
}

// 8. Invalid messages invoke "INVALID_FORMAT" error ✅
async function test_invalid_messages() {
  const test_node = new LightNode();
  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(json_message);

  let json2_message: any = {
    type: "diufygeuybhv",
  };
  test_node._write(json2_message);

  // let json3_message: any = {
  //     "type": "hello",
  // };
  // test_node._write(json3_message);

  // let json4_message: any = {
  //     "type": "hello",
  //     "version": "jd3.x"
  // };
  // test_node._write(json4_message);

  // let json5_message: any = {
  //     "type": "diufygeuybhv",
  //     "version": "5.8.2"
  // };
  // test_node._write(json5_message);

  // let json6_message: any = {
  //     "Wbgygvf7rgtyv7tfbgy{{{": "diufygeuybhv",
  // };
  // test_node._write(json6_message);
}

async function reset_peer_list() {
  peers_json["peers"] = [
    "45.63.84.226:18018",
    "45.63.89.228:18018",
    "144.202.122.8:18018",
  ];
  _update_json_list("../peers.json", peers_json);
}

// 9. Sent peers that should update node's peers ✅
async function test_update_peers() {
  await reset_peer_list();

  const test_node = new LightNode();
  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(json_message);

  const peer_list = [
    "10.10.10.100:18018",
    "179.144.4.81:18018",
    "76.51.93.253:18018",
    "227.254.221.40:18018",
    "241.30.105.72:18018",
    "171.254.151.197:18018",
    "128.78.39.235:18018",
    "142.200.156.252:18018",
    "241.172.39.152:18018",
    "210.112.51.26:18018",
    "255.27.1.14:18018",
  ];

  let json2_message: any = { peers: peer_list, type: "peers" };
  test_node._write(json2_message);

  await sleep(3000);
  test_node._client.destroy();
  await sleep(3000);
  test_node._client.connect(port, ip_address, () => { });

  test_node._write(json_message);
  let json3_message: any = {
    type: "getpeers",
  };
  test_node._write(json3_message);

  test_node._client.on("data", (data: string) => {
    const messages = data.toString().split("\n");
    for (const message of messages) {
      if (message != "") {
        const received_message = JSON.parse(message);
        if (
          received_message.type == "peers" &&
          Array.isArray(received_message.peers)
        ) {
          const received_peers = received_message.peers;
          for (const peer of peer_list) {
            if (received_peers.indexOf(peer) == -1) {
              console.error("missing peer: ", peer);
            }
          }
        }
      }
    }
  });
}

// segmented message (no timeout)
async function test_buffer() {
  const test_node = new LightNode();
  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(json_message);
  const peer_message: string = `{"type": "getpeers"}\n`;

  for (let i = 0; i < peer_message.length; i++) {
    const char: string = peer_message.charAt(i);
    console.log(char);
    await sleep(100);
    test_node._client.write(char);
  }

  test_node._client.on("data", (data: string) => {
    const messages = data.toString().split("\n");
    for (const message of messages) {
      if (message != "") {
        const received_message = JSON.parse(message);
        if (
          received_message.type == "peers" &&
          Array.isArray(received_message.peers)
        ) {
          console.log("success");
        }
      }
    }
  });
}

// segmented message (timeout)
async function test_buffer_timeout() {
  const test_node = new LightNode();
  const message_1: string = `{"type": "hello" "ver`;

  test_node._client.write(message_1);
  await sleep(15000);
  if (!test_node._client.destroyed) {
    console.error("shoudl have timed out");
  }
}

async function test_buffer_overflow() {
  const test_node = new LightNode();
  let message: string = "";
  for (let i = 0; i < 1000001; i++) {
    message += ".";
  }

  message += "\n";

  test_node._client.write(message);
  if (!test_node._client.destroyed) {
    console.error("shoudl have overflowed");
  }
}

function test_rate_limiting() {
  const test_node = new LightNode();
  const json_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  for (let i = 0; i < 1000; i++) {
    test_node._write(json_message);
  }
}

test_rate_limiting(); // change this to test whatever test you want to run
