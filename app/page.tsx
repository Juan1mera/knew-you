'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, joinSessionByCode } from '@/src/lib/services/session';
import { Users, Plus, KeyRound, Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/src/lib/i18n';

export default function Home() {
  const router = useRouter();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');
  const [name, setName] = useState('');
  const [sessionCode, setSessionCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const { sessionId, hostId } = await createSession(name);
      localStorage.setItem('knewyou_user_id', hostId);
      localStorage.setItem('knewyou_user_name', name);
      router.push(`/lobby/${sessionId}`);
    } catch (err) {
      console.error(err);
      setError(t('errorCreateSession'));
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !sessionCode.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const result = await joinSessionByCode(sessionCode, name);
      if (result) {
        localStorage.setItem('knewyou_user_id', result.playerId);
        localStorage.setItem('knewyou_user_name', name);
        router.push(`/lobby/${result.sessionId}`);
      } else {
        setError(t('invalidSessionCode'));
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError(t('errorJoinSession'));
      setIsLoading(false);
    }
  };

  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center p-6"
      style={{ zIndex: 1 }}
    >
      {/* ── Hero section ─────────────────────────────── */}
      <div className="w-full max-w-lg anim-fade-up" style={{ animationDelay: '0ms' }}>

        {/* Wordmark */}
        <div className="text-center mb-12">
          <p
            className="text-xs font-semibold tracking-[0.18em] uppercase mb-5"
            style={{ color: 'var(--text-muted)' }}
          >
            Social · Party Game
          </p>
          <h1
            className="text-display text-6xl mb-5"
            style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
          >
            KnewYou
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: 'var(--text-secondary)', maxWidth: '30ch', margin: '0 auto' }}
          >
            {t('subtitle')}
          </p>
        </div>

        {/* ── Card ─────────────────────────────────────── */}
        <div className="paper-card overflow-hidden" style={{ animationDelay: '80ms' }}>

          {/* Tab bar */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-muted)',
            }}
          >
            {(['join', 'create'] as const).map((tab) => {
              const active = activeTab === tab;
              const label = tab === 'join' ? t('join') : t('createGame');
              return (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => { setActiveTab(tab); setError(''); }}
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    fontSize: '0.9rem',
                    fontWeight: active ? '600' : '400',
                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                    background: active ? 'var(--accent-light)' : 'transparent',
                    borderBottom: active
                      ? '2px solid var(--accent)'
                      : '2px solid transparent',
                    transition: 'all 0.18s ease',
                    cursor: 'pointer',
                    marginBottom: '-1px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Form body */}
          <div style={{ padding: '32px' }}>
            {activeTab === 'join' ? (
              <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FormField label={t('yourName')} icon={<Users size={16} />}>
                  <input
                    id="input-join-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="paper-input"
                    placeholder={t('namePlaceholder')}
                    style={{ paddingLeft: '38px' }}
                  />
                </FormField>

                <FormField label={t('sessionCode')} icon={<KeyRound size={16} />}>
                  <input
                    id="input-join-code"
                    type="text"
                    required
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    className="paper-input"
                    placeholder={t('codePlaceholder')}
                    maxLength={6}
                    style={{ paddingLeft: '38px', letterSpacing: '0.2em', fontWeight: 600, fontSize: '1rem' }}
                  />
                </FormField>

                {error && <ErrorMessage message={error} />}

                <button
                  id="btn-join"
                  type="submit"
                  disabled={isLoading || !name.trim() || !sessionCode.trim()}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '4px', paddingTop: '14px', paddingBottom: '14px' }}
                >
                  {isLoading
                    ? <Loader2 size={18} className="animate-spin" />
                    : <>{t('enterRoom')} <ArrowRight size={16} /></>
                  }
                </button>
              </form>
            ) : (
              <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <FormField label={t('yourNameHost')} icon={<Users size={16} />}>
                  <input
                    id="input-create-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="paper-input"
                    placeholder={t('namePlaceholder')}
                    style={{ paddingLeft: '38px' }}
                  />
                </FormField>

                {error && <ErrorMessage message={error} />}

                <button
                  id="btn-create"
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '4px', paddingTop: '14px', paddingBottom: '14px' }}
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <><Plus size={16} /> {t('createNewSession')}</>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p
          className="text-center mt-8 text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          No registration needed · Play instantly
        </p>
      </div>
    </main>
  );
}

/* ── Sub-components ────────────────────────────────── */

function FormField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          letterSpacing: '0.01em',
        }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <p
      style={{
        fontSize: '0.875rem',
        color: 'var(--error)',
        background: 'var(--error-light)',
        border: '1px solid var(--accent-muted)',
        borderRadius: '8px',
        padding: '10px 14px',
      }}
    >
      {message}
    </p>
  );
}
