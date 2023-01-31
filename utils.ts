import * as ed from "@noble/ed25519";
import * as net from 'net';
import { canonicalize } from "json-canonicalize";
import isValidDomain from 'is-valid-domain';
import { z } from "zod";
import { MESSAGE_TYPES, INVALID_TYPES, OBJECT_TYPES } from './types';

export function check_valid_ip(ip_address: string): Boolean {
    try {
        const ip_address_components: string[] = ip_address.split(":");
        if (ip_address_components.length !== 2) {
            return false;
        }
        const host: string = ip_address_components[0];
        const port: number = parseInt(ip_address_components[1]);

        if (net.isIP(host) == 0) {
            return false;
        }

        if (port < 1 || port > 65535) {
            return false;
        }
        return true;
    } catch (err: any) {
        return false;
    }
}

export function check_valid_dns(dns_address: string): Boolean {
    try {
        const dns_address_components: string[] = dns_address.split(":");
        if (dns_address_components.length !== 2) {
            return false;
        }
        const host: string = dns_address_components[0];
        const port: number = parseInt(dns_address_components[1]);

        if (host == null) {
            return false;
        }

        if (port < 1 || port > 65535) {
            return false;
        }

        return isValidDomain(host);
    } catch (err: any) {
        return false;
    }
}

// must first check that input is a valid object
export function parse_object(object: any): MESSAGE_TYPES | INVALID_TYPES {

    const hex_regex: RegExp = new RegExp('^[a-f0-9]+$');

    const BLOCK_TYPE = z.object({
        type: z.literal('block'),
        txids: z.array(z.string().length(64).regex(hex_regex)),
        nonce: z.string().length(64).regex(hex_regex),
        previd: z.union([z.string().length(64).regex(hex_regex), z.null()]),
        created: z.number(),
        // T: z.literal('00000000abc00000000000000000000000000000000000000000000000000000'),
        T: z.string(),
        miner: z.string().max(128).optional(),
        note: z.string().max(128).optional(),
        studentids: z.array(z.string().max(128)).max(10).optional()
    }).strict();

    const TRANSACTION_TYPE = z.object({
        type: z.literal('transaction'),
        inputs: z.array(z.object({
            outpoint: z.object({
                txid: z.string().length(64).regex(hex_regex),
                index: z.number().int().nonnegative(),
            }),
            sig: z.string().length(128).regex(hex_regex),
        })),
        outputs: z.array(z.object({
            pubkey: z.string().length(64).regex(hex_regex),
            value: z.number().int().nonnegative(),
        }))
    }).strict();

    const COINBASE_TYPE = z.object({
        type: z.literal('transaction'),
        height: z.number().int().nonnegative(),
        outputs: z.array(z.object({
            pubkey: z.string().length(64).regex(hex_regex),
            value: z.number().int().nonnegative(),
        })).length(1)
    }).strict();

    if (BLOCK_TYPE.safeParse(object).success) {
        return MESSAGE_TYPES.BLOCK_RECEIVED;
    } else if (TRANSACTION_TYPE.safeParse(object).success) {
        return MESSAGE_TYPES.TRANSACTION_RECEIVED;
    } else if (COINBASE_TYPE.safeParse(object).success) {
        return MESSAGE_TYPES.COINBASE_RECEIVED;
    } else {
        return INVALID_TYPES.INVALID_FORMAT;
    }
}

export function hexToBytes(hex: string, encoding: BufferEncoding): Uint8Array {
    return Uint8Array.from(Buffer.from(hex, encoding));
}

export function bytesToHex(byteArray: any) {
    return Array.from(byteArray, (byte: any) => {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('')
}

export async function make_coinbase_tx(private_key: any, value: number) {

    const public_key = bytesToHex(await ed.getPublicKey(private_key));

    const coinbase_tx = {
        "type": "transaction",
        "height": 0,
        "outputs": [{
            "pubkey": public_key,
            "value": value,
        }]
    }

    return coinbase_tx;

}

export async function make_tx(tx_ids: string[], indices: number[], private_keys: any[], public_keys: any[], values: number[]) {

    let tx = {
        type: "transaction",
        inputs: [{
            "outpoint": null,
            "sig": null,
        }],
        outputs: [{
            "pubkey": null,
            "value": null,
        }]
    }

    for (let i = 0; i < tx_ids.length; i++) {
        const outpoint = {
            "txid": tx_ids[i],
            "index": indices[i],
        }
        const input_object: any = {
            "outpoint": outpoint,
            "sig": null
        }
        tx['inputs'][i] = input_object
    }

    for (let i = 0; i < public_keys.length; i++) {
        tx['outputs'][i]['pubkey'] = public_keys[i];
        tx['outputs'][i]['value'] = values[i] as any;
    }


    const canonicalized_tx = canonicalize(tx);

    for (let i = 0; i < private_keys.length; i++) {
        const sig: any = bytesToHex(await ed.sign(hexToBytes(canonicalized_tx, 'utf8'), private_keys[i]));
        tx['inputs'][i]['sig'] = sig;
    }

    return tx;
}

