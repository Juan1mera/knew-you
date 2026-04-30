'use client';

import { useLanguage } from '@/src/lib/i18n';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <select
        id="language-switcher"
        value={language}
        onChange={(e) => setLanguage(e.target.value as 'es' | 'ru')}
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '0.8125rem',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: 'var(--shadow-sm)',
          transition: 'border-color 0.15s ease',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border-default)')}
      >
        <option value="es">🇪🇸 Español</option>
        <option value="ru">🇷🇺 Русский</option>
      </select>
    </div>
  );
}
