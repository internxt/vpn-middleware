import { Transform } from "stream";

const MAX_SPEED = 125 * 1024; // 125 KB/s (1 Mbps)

export class ThrottleStream extends Transform {
  private lastChunkTime: number;
  private remainingBytes: number;

  constructor() {
    super();
    this.lastChunkTime = Date.now();
    this.remainingBytes = MAX_SPEED;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: Function) {
    const now = Date.now();
    const elapsedTime = now - this.lastChunkTime;

    if (elapsedTime >= 1000) {
      // Reset counter every second
      this.remainingBytes = MAX_SPEED;
      this.lastChunkTime = now;
    }

    if (chunk.length <= this.remainingBytes) {
      // Allow full chunk if within speed limit
      this.remainingBytes -= chunk.length;
      this.push(chunk);
      callback();
    } else {
      // If chunk exceeds limit, split and delay the remaining part
      const allowedChunk = chunk.slice(0, this.remainingBytes);
      const remainingChunk = chunk.slice(this.remainingBytes);

      this.remainingBytes = 0;
      this.push(allowedChunk);

      setTimeout(() => {
        this.remainingBytes = MAX_SPEED;
        this.push(remainingChunk);
        callback();
      }, 1000);
    }
  }
}
