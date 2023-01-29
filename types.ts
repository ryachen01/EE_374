export enum MESSAGE_TYPES {
    HELLO_RECEIVED = 0,
    SEND_HELLO = 1,
    PEERS_REQUEST = 2,
    PEERS_RECEIVED = 3,
    REQUEST_PEERS = 4,
    CHAINTIP_REQUEST = 5,
    CHAINTIP_RECEIVED = 6,
    REQUEST_CHAINTIP = 7,
    MEMPOOL_REQUEST = 8,
    MEMPOOL_RECEIVED = 9,
    REQUEST_MEMPOOL = 10,
    OBJECT_REQUEST = 11,
    BLOCK_RECEIVED = 12,
    TRANSACTION_RECEIVED = 13,
    COINBASE_RECEIVED = 14,
    REQUEST_OBJECT = 15,
    HAS_OBJECT = 16,
    ERROR_RECEIVED = 17,
}

export enum INVALID_TYPES {
    INVALID_FORMAT = 18,
    INTERNAL_ERROR = 19,
    UNKNOWN_OBJECT = 20,
    UNFINDABLE_OBJECT = 21,
    INVALID_HANDSHAKE = 22,
    INVALID_TX_OUTPOINT = 23,
    INVALID_TX_SIGNATURE = 24,
    INVALID_TX_CONSERVATION = 25,
    INVALID_BLOCK_COINBASE = 26,
    INVALID_BLOCK_TIMESTAMP = 27,
    INVALID_BLOCK_POW = 28,
    INVALID_GENESIS = 29,
    INVALID_MESSAGE = 30,
}

export enum OBJECT_TYPES {
    BLOCK_TYPE = 31,
    TRANSACTION_TYPE = 32,
    COINBASE_TYPE = 33,
    INVALID_OBJECT = 34,
}