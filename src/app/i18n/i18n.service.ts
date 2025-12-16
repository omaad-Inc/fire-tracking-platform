import { Injectable, signal } from '@angular/core';
import { EN } from './en';
import { FR } from './fr';

type Dictionaries = typeof EN & typeof FR;
type Lang = 'fr' | 'en';

@Injectable({ providedIn: 'root' })
export class I18nService {
  private dicts: Record<Lang, Dictionaries> = {
    en: EN as any,
    fr: FR as any
  };
  lang = signal<Lang>('fr');

  setLang(l: Lang) {
    this.lang.set(l);
  }

  t(path: string, params?: Record<string, string | number>): string {
    const lang = this.lang();
    const value = path.split('.').reduce<any>((acc, key) => (acc ? acc[key] : undefined), this.dicts[lang]);
    if (typeof value !== 'string') return path;
    if (!params) return value;
    return Object.keys(params).reduce((s, k) => s.replace(`{{${k}}}`, String(params[k])), value);
  }
}


