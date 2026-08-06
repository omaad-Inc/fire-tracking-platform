/**
 * Tolerant SSE frame parser for the chat stream (AI kanban UX-3).
 *
 * The backend emits `data: {json}\n\n`, but the bytes that reach the client
 * have crossed Render's proxy chain and any middlebox in between, so the
 * parser accepts the full spec surface instead of one happy framing:
 * `\r\n` / `\r` / `\n` line endings, `event:`/`id:`/`retry:` fields and
 * `:` comments (ignored), multiple `data:` lines per frame (joined with
 * `\n` per spec), and frames split anywhere across network chunks —
 * including a CRLF pair split between two chunks.
 *
 * push() takes a decoded chunk and returns the data payloads of every frame
 * completed by it. flush() drains a final unterminated frame at end of
 * stream (stricter than spec, which discards it: a server that closed the
 * body right after the last `data:` line still gets its event delivered).
 */
export class SseParser {
    /** Unconsumed tail: a partial line, possibly ending in an ambiguous `\r`. */
    private buf = '';
    /** `data:` values of the frame being assembled. */
    private data: string[] = [];

    push(chunk: string): string[] {
        this.buf += chunk;
        const events: string[] = [];
        let start = 0;
        for (let i = 0; i < this.buf.length; i++) {
            const ch = this.buf[i];
            if (ch !== '\n' && ch !== '\r') continue;
            // A `\r` as the LAST buffered char may be half of a CRLF whose
            // `\n` is in the next chunk: leave it buffered until we know.
            if (ch === '\r' && i === this.buf.length - 1) break;
            const line = this.buf.slice(start, i);
            if (ch === '\r' && this.buf[i + 1] === '\n') i++;
            start = i + 1;
            const payload = this.consumeLine(line);
            if (payload !== null) events.push(payload);
        }
        this.buf = this.buf.slice(start);
        return events;
    }

    /** End of stream: deliver a final frame the server never terminated. */
    flush(): string[] {
        const events: string[] = [];
        if (this.buf !== '') {
            // A trailing lone `\r` was a line terminator after all.
            const payload = this.consumeLine(this.buf.replace(/\r$/, ''));
            if (payload !== null) events.push(payload);
            this.buf = '';
        }
        if (this.data.length > 0) {
            events.push(this.data.join('\n'));
            this.data = [];
        }
        return events;
    }

    /** Feed one complete line; returns a frame payload when the line ends one. */
    private consumeLine(line: string): string | null {
        if (line === '') {
            // Blank line dispatches the assembled frame (if it carried data).
            if (this.data.length === 0) return null;
            const payload = this.data.join('\n');
            this.data = [];
            return payload;
        }
        if (line.startsWith(':')) return null; // comment / keep-alive ping
        const colon = line.indexOf(':');
        const field = colon === -1 ? line : line.slice(0, colon);
        if (field !== 'data') return null; // event:/id:/retry:/unknown: ignored
        let value = colon === -1 ? '' : line.slice(colon + 1);
        if (value.startsWith(' ')) value = value.slice(1); // spec: one leading space
        this.data.push(value);
        return null;
    }
}
