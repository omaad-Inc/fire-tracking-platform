import { SseParser } from './sse-parser';

/**
 * UX-3: the SSE parser must survive every framing a proxy chain can produce,
 * not just the backend's canonical `data: {json}\n\n`.
 */
describe('SseParser', () => {
    let parser: SseParser;
    beforeEach(() => { parser = new SseParser(); });

    /** Push chunks, collect every payload including the EOF flush. */
    function parse(chunks: string[]): string[] {
        const out: string[] = [];
        for (const c of chunks) out.push(...parser.push(c));
        out.push(...parser.flush());
        return out;
    }

    it('parses canonical LF framing', () => {
        expect(parse(['data: {"a":1}\n\ndata: {"b":2}\n\n']))
            .toEqual(['{"a":1}', '{"b":2}']);
    });

    it('parses CRLF framing from a proxy', () => {
        expect(parse(['data: {"a":1}\r\n\r\ndata: {"b":2}\r\n\r\n']))
            .toEqual(['{"a":1}', '{"b":2}']);
    });

    it('parses lone-CR framing', () => {
        expect(parse(['data: {"a":1}\r\rdata: {"b":2}\r\r']))
            .toEqual(['{"a":1}', '{"b":2}']);
    });

    it('handles a frame split anywhere across network chunks', () => {
        expect(parse(['data: {"a', '":1}\n', '\ndata: {"b":2}', '\n\n']))
            .toEqual(['{"a":1}', '{"b":2}']);
    });

    it('handles a CRLF pair split across two chunks', () => {
        // The trailing \r is ambiguous until the next chunk arrives.
        expect(parse(['data: {"a":1}\r', '\n\r\ndata: {"b":2}\r\n\r\n']))
            .toEqual(['{"a":1}', '{"b":2}']);
    });

    it('a buffered lone CR that was a real terminator still ends its line', () => {
        expect(parse(['data: {"a":1}\r', 'data: x\r\r']))
            // First \r terminates the data line once 'data: x' proves it was lone.
            .toEqual(['{"a":1}\nx']);
    });

    it('ignores event:, id:, retry: fields and comment lines', () => {
        expect(parse([
            ': keep-alive\nevent: message\nid: 42\nretry: 3000\ndata: {"a":1}\n\n',
        ])).toEqual(['{"a":1}']);
    });

    it('joins multiple data: lines with \\n (spec behavior)', () => {
        expect(parse(['data: line1\ndata: line2\n\n'])).toEqual(['line1\nline2']);
    });

    it('accepts data without the optional leading space', () => {
        expect(parse(['data:{"a":1}\n\n'])).toEqual(['{"a":1}']);
    });

    it('a blank line with no pending data dispatches nothing', () => {
        expect(parse(['\n\n\n: ping\n\n'])).toEqual([]);
    });

    it('flush delivers a final frame the server never terminated', () => {
        expect(parse(['data: {"a":1}\n\ndata: {"b":2}'])).toEqual(['{"a":1}', '{"b":2}']);
    });

    it('flush delivers a final frame ending in a bare newline', () => {
        expect(parse(['data: {"a":1}\n'])).toEqual(['{"a":1}']);
    });
});
