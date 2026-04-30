'use client';

import { useLanguage } from '@/src/lib/i18n';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
      <Globe className="w-5 h-5 text-slate-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'es' | 'ru')}
        className="bg-black/30 text-white border border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="es">Español</option>
        <option value="ru">Русский</option>
      </select>
    </div>
  );
}
