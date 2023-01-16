"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const setup_1 = require("./setup");
const server_instance = new setup_1.Server();
server_instance.listen();
server_instance.connect();
