import { LightNode } from "./light_node";
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// OBJECT EXCHANGE

async function test_valid_send_recieve() {
    const test_node = new LightNode();
    const hello_message: any = {
      type: "hello",
      version: "0.9.0",
      agent: "Marabu Test Client",
    };
    test_node._write(hello_message);
  
    const genesis_object: any = {
      object: {
        height: 0,
        outputs: [
          {
            pubkey:
              "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
            value: 50000000000,
          },
        ],
        type: "transaction",
      },
      type: "object",
    };
    test_node._write(genesis_object);
  
    await sleep(2000);
  
    const tx_message: any = {
      object: {
        inputs: [
          {
            outpoint: {
              index: 0,
              txid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
            },
            sig: "060bf7cbe141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
          },
        ],
        outputs: [
          {
            pubkey:
              "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
            value: 10,
          },
        ],
        type: "transaction",
      },
      type: "object",
    };
  
    test_node._write(tx_message);

    const get_message: any = {
        type: "getobject",
        objectid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
      };

    test_node._write(get_message);


}

async function test_valid_ihaveobject() {
    const test_node = new LightNode();
    const hello_message: any = {
      type: "hello",
      version: "0.9.0",
      agent: "Marabu Test Client",
    };
    test_node._write(hello_message);
  
    const genesis_object: any = {
      object: {
        height: 0,
        outputs: [
          {
            pubkey:
              "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
            value: 50000000000,
          },
        ],
        type: "transaction",
      },
      type: "object",
    };
    test_node._write(genesis_object);
  
    await sleep(2000);
  
    const ihaveobject_message: any = {
        type: "ihaveobject",
        objectid: "hahahah",
      };

    test_node._write(ihaveobject_message);
}

// TRANSACTION VALIDATION
async function test_valid_tx() {
  const test_node = new LightNode();
  const hello_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(hello_message);

  const genesis_object: any = {
    object: {
      height: 0,
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000000,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  test_node._write(genesis_object);

  await sleep(2000);

  const tx_message: any = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 0,
            txid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
          },
          sig: "060bf7cbe141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
        },
      ],
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 10,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };

  test_node._write(tx_message);
}

async function test_invalid_tx_outpoint() {
  const test_node = new LightNode();
  const hello_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(hello_message);

  const genesis_object: any = {
    object: {
      height: 0,
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000000,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  test_node._write(genesis_object);

  await sleep(2000);

  const tx_message: any = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 0,
            txid: "abcdefg1891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
          },
          sig: "060bf7cbe141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
        },
      ],
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 10,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };

  test_node._write(tx_message);
}

async function test_invalid_tx_index() {
  const test_node = new LightNode();
  const hello_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(hello_message);

  const genesis_object: any = {
    object: {
      height: 0,
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000000,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  test_node._write(genesis_object);

  await sleep(2000);

  const tx_message: any = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 10,
            txid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
          },
          sig: "060bf7cbe141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
        },
      ],
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 10,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };

  test_node._write(tx_message);
}

async function test_invalid_tx_conservation() {
  const test_node = new LightNode();
  const hello_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(hello_message);

  const genesis_object: any = {
    object: {
      height: 0,
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000000,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  test_node._write(genesis_object);

  await sleep(2000);

  const tx_message: any = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 0,
            txid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
          },
          sig: "060bf7cbe141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
        },
      ],
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000001,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };

  test_node._write(tx_message);
}

async function test_invalid_tx_signature() {
  const test_node = new LightNode();
  const hello_message: any = {
    type: "hello",
    version: "0.9.0",
    agent: "Marabu Test Client",
  };
  test_node._write(hello_message);

  const genesis_object: any = {
    object: {
      height: 0,
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 50000000000,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };
  test_node._write(genesis_object);

  await sleep(2000);

  const tx_message: any = {
    object: {
      inputs: [
        {
          outpoint: {
            index: 0,
            txid: "b303d841891f91af118a319f99f5984def51091166ac73c062c98f86ea7371ee",
          },
          sig: "000000000141fecfebf6dafbd6ebbcff25f82e729a7770f4f3b1f81a7ec8a0ce4b287597e609b822111bbe1a83d682ef14f018f8a9143cef25ecc9a8b0c1c405",
        },
      ],
      outputs: [
        {
          pubkey:
            "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
          value: 10,
        },
      ],
      type: "transaction",
    },
    type: "object",
  };

  test_node._write(tx_message);
}

test_valid_tx();
