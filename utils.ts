import * as net from 'net';
import isValidDomain from 'is-valid-domain';

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

