'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSession, startGame } from '@/src/lib/services/session';
import { Session, Participant } from '@/src/types';
import { Users, Copy, CheckCircle2, Play, AlertCircle, Crown, User } from 'lucide-react';
import { useLanguage } from '@/src/lib/i18n';

export default function LobbyClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('knewyou_user_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(storedId);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSession(sessionId, (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
      } else {
        setError(t('sessionNotFound'));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [sessionId]);

  useEffect(() => {
    if (session?.status === 'phase1') {
      router.push(`/play/${sessionId}`);
    }
  }, [session?.status, sessionId, router]);

  const copyCode = () => {
    if (session?.shortCode) {
      navigator.clipboard.writeText(session.shortCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    try {
      setLoading(true);
      await startGame(sessionId);
    } catch (err) {
      console.error(err);
      setError(t('errorStartGame'));
      setLoading(false);
    }
  };

  /* ── Loading ──────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', gap: '16px' }}>
        <div
          style={{
            width: 40, height: 40,
            border: '3px solid var(--border-default)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
          }}
          className="animate-spin"
        />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('connectingToRoom')}</p>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────── */
  if (error || !session) {
    return (
      <div className="paper-card" style={{ padding: '48px', textAlign: 'center', maxWidth: '420px', margin: '0 auto' }}>
        <AlertCircle style={{ width: 48, height: 48, color: 'var(--error)', margin: '0 auto 20px' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>{t('error')}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>{error}</p>
        <button className="btn-ghost" onClick={() => router.push('/')}>{t('backToHome')}</button>
      </div>
    );
  }

  const isHost = currentUserId && session.host_id === currentUserId;

  return (
    <div className="animate-in fade-in duration-500" style={{ width: '100%' }}>

      {/* ── Header ───────────────────────────────── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        marginBottom: '40px',
      }}>
        <div>
          <p className="tag" style={{ marginBottom: '12px' }}>{t('lobbyTitle')}</p>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '2.75rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              lineHeight: 1.15,
              marginBottom: '8px',
            }}
          >
            {t('lobbyTitle')}
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>{t('lobbySubtitle')}</p>
        </div>

        {/* Code pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-sm)',
            alignSelf: 'flex-start',
          }}
        >
          <div>
            <span style={{
              display: 'block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '2px',
            }}>
              {t('inviteCode')}
            </span>
            <span style={{
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '0.18em',
              color: 'var(--accent)',
              fontFamily: 'var(--font-sans)',
            }}>
              {session.shortCode}
            </span>
          </div>
          <button
            id="btn-copy-code"
            onClick={copyCode}
            style={{
              padding: '8px',
              background: copied ? 'var(--success-light)' : 'var(--bg-subtle)',
              border: '1px solid var(--border-muted)',
              borderRadius: '8px',
              color: copied ? 'var(--success)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.15s',
            }}
            title="Copiar código"
          >
            {copied
              ? <CheckCircle2 style={{ width: 18, height: 18 }} />
              : <Copy style={{ width: 18, height: 18 }} />
            }
          </button>
        </div>
      </div>

      {/* ── Players card ─────────────────────────── */}
      <div className="paper-card" style={{ overflow: 'hidden', marginBottom: '32px' }}>
        {/* Card header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-subtle)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ width: 18, height: 18, color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t('players')}</span>
          </div>
          <span className="tag">
            {session.participants.length} {t('connected')}
          </span>
        </div>

        {/* Players grid */}
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '12px',
          }}>
            {session.participants.map((participant: Participant) => {
              const isMe = participant.id === currentUserId;
              return (
                <div
                  key={participant.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: 'var(--radius-md)',
                    background: isMe ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    border: `1px solid ${isMe ? 'var(--accent-muted)' : 'var(--border-muted)'}`,
                    transition: 'border-color 0.15s',
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: participant.isHost ? '#fef3e8' : 'var(--bg-card)',
                    border: `1px solid ${participant.isHost ? '#f0d0a8' : 'var(--border-default)'}`,
                    color: participant.isHost ? 'var(--warning)' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}>
                    {participant.isHost
                      ? <Crown style={{ width: 16, height: 16 }} />
                      : <User style={{ width: 16, height: 16 }} />
                    }
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {participant.name}
                      {isMe && (
                        <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '0.75rem', marginLeft: 6 }}>
                          ({t('you')})
                        </span>
                      )}
                    </p>
                    {participant.isHost && (
                      <p style={{ fontSize: '0.6875rem', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {t('host')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {isHost ? (
          <button
            id="btn-start-game"
            onClick={handleStartGame}
            disabled={session.participants.length < 2}
            className="btn-primary"
            style={{ padding: '14px 32px', fontSize: '1rem' }}
          >
            <Play style={{ width: 18, height: 18 }} />
            {t('startGame')}
          </button>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 24px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-muted)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}>
            <div
              style={{
                width: 16, height: 16,
                border: '2px solid var(--border-default)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
              }}
              className="animate-spin"
            />
            {t('waitingForHost')}
          </div>
        )}
      </div>
    </div>
  );
}
