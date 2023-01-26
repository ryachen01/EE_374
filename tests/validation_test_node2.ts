import { LightNode } from "./light_node";
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function test_valid_twonode_send_recieve() {
    const test_node = new LightNode();
    const hello_message: any = {
      type: "hello",
      version: "0.9.0",
      agent: "Marabu Test Client",
    };
    test_node._write(hello_message);
  
    // const genesis_object: any = {
    //   object: {
    //     height: 0,
    //     outputs: [
    //       {
    //         pubkey:
    //           "958f8add086cc348e229a3b6590c71b7d7754e42134a127a50648bf07969d9a0",
    //         value: 50000000000,
    //       },
    //     ],
    //     type: "transaction",
    //   },
    //   type: "object",
    // };
    // test_node._write(genesis_object);
  
    // await sleep(2000);
  
    // const ihaveobject_message: any = {
    //     type: "getobject",
    //     objectid: "5e6e6325a9323fa86c353fff97b748db3fad58024ec36f7ca218c594debdb363",
    //   };

    // test_node._write(ihaveobject_message);

}

test_valid_twonode_send_recieve();