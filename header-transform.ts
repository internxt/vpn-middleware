import { Transform, TransformCallback } from "stream";
const HTTPParser = require("http-parser-js").HTTPParser;

const CR = 0xd; // "\r" in decimal
const LF = 0xa; // "\n" in decimal
const CRLF = "\r\n";
const BUFFER_LF_LF = Buffer.from("\n\n");
const CRLF_BUFFER = Buffer.from(CRLF);

const STATE_NONE = 0, STATE_FOUND_LF = 1, STATE_FOUND_LF_CR = 2;


export class HeaderTransform extends Transform {
    private parser: any | null;
    private parserData = {
        headersCompleted: false,
        upgrade: null,
        method: null,
    };
    private state: number;
    private extraHeaders: Record<string, string> = {};

    constructor() {
        super();
        this.parser = new HTTPParser(HTTPParser.REQUEST);
        this.state = STATE_NONE;
    }

    /**
     * Add a header to be inserted before the request is forwarded.
     * @param key - Header name (e.g., "Authorization")
     * @param value - Header value (e.g., "Bearer token")
     */
    addHeader(key: string, value: string) {
        this.extraHeaders[key] = value;
    }

    _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        if (!this.parser) {
            this.push(chunk);
            return callback();
        }

        this.parser[HTTPParser.kOnHeadersComplete] = (req) => {
            this.parserData.headersCompleted = true;
            this.parserData.upgrade = req.upgrade;
            this.parserData.method = req.method;
        };

        // Read chunk to add proxy authorization
        // Reading from buffer directly without converting to string every line is faster
        // It's almost the same logic as the original repository, I just modified extra headers part
        let lastPushIndex = 0;
        const bufferLength = chunk.length;
        for (let i = 0; i < bufferLength; i++) {
            if (this.state === STATE_NONE) {
                if (chunk[i] === LF) {
                    this.state = STATE_FOUND_LF;
                }
                continue;
            }

            if (chunk[i] === LF) {
                this.parserData.headersCompleted = false;
                this.parser.execute(chunk.subarray(lastPushIndex, i + 1));

                if (this.parserData.headersCompleted) {
                    // Extract the original headers buffer (excluding the last CR if present) if \r\n\r\n, we just want \r\n
                    const headersBuffer = chunk.subarray(lastPushIndex, chunk[i - 1] === CR ? i - 1 : i);

                    //  Ensure each new header ends with \r\n
                    const extraHeadersString = Object.entries(this.extraHeaders)
                        .map(([key, value]) => `${key}: ${value}${CRLF}`)
                        .join("");

                    const extraHeadersBuffer = Buffer.from(extraHeadersString);
                    const endOfHeadersBuffer = this.state === STATE_FOUND_LF_CR ? CRLF_BUFFER : BUFFER_LF_LF

                    // Separated pushing to prevent creating new buffer by concatenation
                    this.push(headersBuffer)
                    this.push(extraHeadersBuffer)
                    this.push(endOfHeadersBuffer)

                    if (this.parserData.method === 5 || this.parserData.upgrade) {
                        this.parser.close();
                        this.parser = null;
                        this.push(chunk.subarray(i + 1));
                        this.state = STATE_NONE;
                        return callback();
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

        //  Body could be mixed with headers in a chunk, we need to push the remaining buffer
        if (lastPushIndex < bufferLength) {
            const remainingChunk = chunk.subarray(lastPushIndex, bufferLength);
            this.parser.execute(remainingChunk);
            this.push(remainingChunk);
        }

        callback();
    }
}