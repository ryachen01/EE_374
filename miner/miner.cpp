#include <iostream>
#include <stdio.h>
#include <chrono>
#include <string>
#include <sstream>
#include <iomanip>
#include <cstring>
#include <thread>
#include <ctime>
#include "blake2.h"

#define MAXBUFLEN 1000000

std::string int_to_hex(uint64_t num)
{
    std::stringstream stream;
    stream << std::setfill('0') << std::setw(64) << std::hex << num;
    std::string result = stream.str();
    return result;
}

void save_file(unsigned char *arr, size_t file_len) {

    FILE *fp = fopen("mined_block.txt", "wb"); // open file in write binary mode
    if (fp == NULL) {
        printf("Error opening file!\n");
    }

    fwrite(arr, sizeof(unsigned char), file_len, fp); // write array to file

    fclose(fp); // close file

    printf("Data written to file successfully!\n");

}

bool valid_hash(unsigned char* hash) {
    return hash[0] == 0 && hash[1] == 0 && hash[2] == 0 && hash[3] == 0 && hash[4] <= 171;
}	

void mine_block(const char *file_name, size_t nonce_offset, size_t num_trials, size_t thread_id)
{

    unsigned char hash[BLAKE2S_OUTBYTES] = {0};
    unsigned char buffer[MAXBUFLEN];
    FILE *fp = fopen(file_name, "r");
    size_t fileLen;
    if (fp != NULL)
    {
        fileLen = fread(buffer, sizeof(char), MAXBUFLEN, fp);
        if (ferror(fp) != 0)
        {
            fputs("Error reading file", stderr);
        }
        else
        {
            buffer[fileLen + 1] = '\0';
        }

        fclose(fp);
    }
    else
    {
        return;
    }

    std::cout << buffer << std::endl;

    const char* target = "nonce\":\"";
    std::size_t len = std::strlen(target);

    size_t replacement_index = -1;

    for (std::size_t i = 0; i < fileLen - len; ++i) {
        if (std::memcmp(buffer + i, target, len) == 0) {
            replacement_index = i;
            break;
        }
    }

    for (size_t n = nonce_offset; n < nonce_offset + num_trials; n++)
    {
	std::string nonce = int_to_hex(n);
	nonce[0] = std::to_string(thread_id)[0];
	const char* nonce_c_str = nonce.c_str();
	std::memcpy(buffer + replacement_index + len, nonce_c_str, 64);
	blake2s_state S[1];
        blake2s_init(S, BLAKE2S_OUTBYTES);
        blake2s_update(S, buffer, fileLen);
        blake2s_final(S, hash, BLAKE2S_OUTBYTES);
	if (valid_hash(hash)) {
	    for (size_t i = 0; i < BLAKE2S_OUTBYTES; i++) {
            printf("%02x", hash[i]);
        }
        printf("\n");
	    save_file(buffer, fileLen);
	    break;
	}

    }
}

int main()
{

    std::srand(std::time(nullptr));
    uint32_t random_value_1 = std::rand();
    uint32_t random_value_2 = std::rand();

    uint64_t starting_nonce = static_cast<uint64_t>(random_value_1) << 32 | random_value_2;
    std::cout << "Starting nonce value: " << starting_nonce << std::endl;
    const size_t trials = 1000000000;
    const int num_threads = 24;
    std::thread threads[num_threads];
    
    // Create worker threads
    for (int i = 0; i < num_threads; i++) {
        threads[i] = std::thread(mine_block, "target.txt", starting_nonce + trials * i, trials, i);
    }

    auto startTime = std::chrono::high_resolution_clock::now();
    for (int i = 0; i < num_threads; i++) {
        threads[i].join();
    }
    auto endTime = std::chrono::high_resolution_clock::now();
    auto overallDuration = std::chrono::duration_cast<std::chrono::nanoseconds>(endTime - startTime);
    float hashRate = trials * num_threads / (overallDuration.count() * 1e-9);
    printf("Hashes / sec: %.3f", hashRate);

    return 0;
}

