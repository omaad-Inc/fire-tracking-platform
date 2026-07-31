import { Pipe, PipeTransform } from '@angular/core';

/**
 * Markdown-lite for assistant text (S12 Phase 1, plan step 4): bold, unordered
 * lists and paragraphs/line breaks. Nothing else on purpose; the model prompt
 * will be told the same subset.
 *
 * Input is escaped BEFORE any tag is produced, and the output is bound via
 * [innerHTML] so Angular's sanitizer still runs over it (strong/ul/li/p/br all
 * survive DomSanitizer's allowlist).
 */
@Pipe({ name: 'markdownLite', standalone: true, pure: true })
export class MarkdownLitePipe implements PipeTransform {
    transform(text: string | null | undefined): string {
        if (!text) return '';
        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const bolded = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Group lines: consecutive "- " lines become one <ul>; blank lines split
        // paragraphs; single newlines inside a paragraph become <br>.
        const out: string[] = [];
        let list: string[] = [];
        let para: string[] = [];
        const flushList = () => {
            if (list.length) { out.push(`<ul>${list.map((l) => `<li>${l}</li>`).join('')}</ul>`); list = []; }
        };
        const flushPara = () => {
            if (para.length) { out.push(`<p>${para.join('<br>')}</p>`); para = []; }
        };
        for (const line of bolded.split('\n')) {
            const item = line.match(/^\s*-\s+(.*)$/);
            if (item) { flushPara(); list.push(item[1]); continue; }
            flushList();
            if (line.trim() === '') { flushPara(); continue; }
            para.push(line);
        }
        flushList();
        flushPara();
        return out.join('');
    }
}
