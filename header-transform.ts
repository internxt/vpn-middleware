import { Transform, TransformCallback } from "stream";
const HTTPParser = require("http-parser-js").HTTPParser;

const CR = 0xd, LF = 0xa, BUF_CR_LF_CR_LF = Buffer.from([0xd, 0xa, 0xd, 0xa]),
    BUF_LF_LF = Buffer.from([0xa, 0xa])
const STATE_NONE = 0, STATE_FOUND_LF = 1, STATE_FOUND_LF_CR = 2;


export class HeaderTransform extends Transform {
    private parser: any | null;
    private parserData = {
        headersCompleted: false,
        upgrade: null,
        method: null
    };
    private state: number;
    private unsavedStart: number;
    private test: Buffer;


    constructor(buf_proxy_basic_auth: Buffer) {
        super();
        this.parser = new HTTPParser(HTTPParser.REQUEST);

        this.state = STATE_NONE;
        this.unsavedStart = 0;
        this.test = buf_proxy_basic_auth;

    }

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        this.parser[HTTPParser.kOnHeadersComplete] = (versionMajor, versionMinor, headers, method,
            url, statusCode, statusMessage, upgrade,
            shouldKeepAlive) => {
            this.parserData.headersCompleted = true;
            this.parserData.upgrade = upgrade;
            this.parserData.method = method;
        };

        let lastPushIndex = 0;
        const buf_len = chunk.length;

        // Read chunk to add proxy authorization
        // It's the same logic as the original repository, but we could try to make it mor readable, that's why I extracted this part
        for (let i = 0; i < buf_len; i++) {
            if (this.state === STATE_NONE) {
                if (chunk[i] === LF) {
                    this.state = STATE_FOUND_LF;
                }
                continue;
            }

            if (chunk[i] === LF) {
                this.parserData.headersCompleted = false;
                this.parser.execute(chunk.slice(this.unsavedStart, i + 1));

                if (this.parserData.headersCompleted) {
                    this.push(chunk.slice(lastPushIndex, chunk[i - 1] === CR ? i - 1 : i));
                    this.push(this.test);
                    this.push(this.state === STATE_FOUND_LF_CR ? BUF_CR_LF_CR_LF : BUF_LF_LF);

                    // Just use this for debugging, it could try to log binaries
                    // If you ever want to check if the authorization logs are being added, store in a temp variable the values pushed above and log it
                    //console.log("Captured Headers:\n", chunk.toString());

                    if (this.parserData.method === 5 || this.parserData.upgrade) {
                        this.parser.close();
                        this.parser = null;

                        this.push(chunk.slice(i + 1));
                        this.state = STATE_NONE;
                        callback();
                        return;
                    }

                    lastPushIndex = i + 1;
                    this.state = STATE_NONE;
                } else {
                    this.state = STATE_FOUND_LF;
                }
            } else if (chunk[i] === CR && this.state === STATE_FOUND_LF) {
                this.state = STATE_FOUND_LF_CR;
            } else {
                this.state = STATE_NONE;
            }
        }

        if (lastPushIndex < buf_len) {
            const remainingChunk = chunk.slice(lastPushIndex, buf_len);
            this.parser.execute(remainingChunk);
            this.push(remainingChunk);
        }

        callback();
    }
}