'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSession, updateSessionStatus } from '@/src/lib/services/session';
import {
  getTestById, submitAnswers, checkPhase1Completion,
  checkPhase2Completion, getCompletedTargetsForUser, calculateResults
} from '@/src/lib/services/test';
import { Session, Test, Question, PlayerScore } from '@/src/types';
import {
  Loader2, AlertCircle, CheckCircle, Send, Users,
  UserCircle2, ArrowLeft, Trophy, Crown, Medal, XCircle, CheckCircle2
} from 'lucide-react';
import { useLanguage } from '@/src/lib/i18n';

/* ── Shared mini-components ───────────────────────── */
const S = {
  // Spinner
  spinner: (size = 40) => (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: '3px solid var(--border-default)',
      borderTopColor: 'var(--accent)',
      animation: 'spin 0.8s linear infinite',
    }} />
  ),
  // Phase badge
  badge: (label: string, warm = false) => (
    <span className={warm ? 'tag tag-warm' : 'tag'} style={{ marginBottom: 12, display: 'inline-block' }}>
      {label}
    </span>
  ),
  // Wait box
  waitBox: (label: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 20px', background: 'var(--accent-light)',
      border: '1px solid var(--accent-muted)', borderRadius: 10,
      color: 'var(--accent)', fontWeight: 600, width: 'fit-content', margin: '0 auto',
    }}>
      <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
      {label}
    </div>
  ),
};

export default function GameClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [completedTargets, setCompletedTargets] = useState<string[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<PlayerScore[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(localStorage.getItem('knewyou_user_id'));
  }, []);

  useEffect(() => {
    const unsub = subscribeToSession(sessionId, async (data) => {
      if (data) {
        setSession(data);
        if (data.test_id && !test) setTest(await getTestById(data.test_id));
        setLoading(false);
      } else { setError(t('sessionNotFound')); setLoading(false); }
    });
    return () => unsub();
  }, [sessionId, test]);

  useEffect(() => {
    if (session?.status !== 'phase2' || !currentUserId) return;
    setPhase2Loading(true);
    getCompletedTargetsForUser(sessionId, currentUserId)
      .then(setCompletedTargets).catch(console.error).finally(() => setPhase2Loading(false));
  }, [session?.status, currentUserId, sessionId]);

  useEffect(() => {
    if (session?.status !== 'phase3' || !session.participants.length) return;
    calculateResults(sessionId, session.participants).then(setLeaderboard).catch(console.error);
  }, [session?.status, sessionId, session?.participants]);

  useEffect(() => {
    if (session?.status !== 'phase1' || !test || currentUserId !== session.host_id) return;
    const iv = setInterval(async () => {
      const done = await checkPhase1Completion(sessionId, session.participants.length, test.questions.length).catch(() => false);
      if (done) { await updateSessionStatus(sessionId, 'phase2'); clearInterval(iv); }
    }, 3000);
    return () => clearInterval(iv);
  }, [session, test, currentUserId, sessionId]);

  useEffect(() => {
    if (session?.status !== 'phase2' || !test || currentUserId !== session.host_id) return;
    const iv = setInterval(async () => {
      const done = await checkPhase2Completion(sessionId, session.participants.length, test.questions.length).catch(() => false);
      if (done) { await updateSessionStatus(sessionId, 'phase3'); clearInterval(iv); }
    }, 3000);
    return () => clearInterval(iv);
  }, [session, test, currentUserId, sessionId]);

  const handleAnswerChange = (qId: string, v: string) => setAnswers(p => ({ ...p, [qId]: v }));

  const handleSubmitPhase1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !currentUserId) return;
    if (test.questions.some(q => !answers[q.id])) { alert(t('pleaseAnswerAll')); return; }
    setIsSubmitting(true);
    try { await submitAnswers(sessionId, currentUserId, currentUserId, answers); setHasSubmitted(true); }
    catch { alert(t('errorSubmitting')); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmitPhase2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !currentUserId || !currentTargetId) return;
    if (test.questions.some(q => !answers[q.id])) { alert(t('pleaseAnswerAll')); return; }
    setIsSubmitting(true);
    try {
      await submitAnswers(sessionId, currentUserId, currentTargetId, answers);
      setCompletedTargets(p => [...p, currentTargetId]);
      setCurrentTargetId(null); setAnswers({});
    } catch { alert(t('errorSubmitting')); }
    finally { setIsSubmitting(false); }
  };

  /* ── Loading / Error ─────────────────────────── */
  if (loading || !session) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
      {S.spinner()}<p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{t('loadingGame')}</p>
    </div>
  );

  if (error) return (
    <div className="paper-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
      <AlertCircle style={{ width: 44, height: 44, color: 'var(--error)', margin: '0 auto 16px' }} />
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>{t('error')}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>{error}</p>
      <button className="btn-ghost" onClick={() => router.push('/')}>{t('backToHome')}</button>
    </div>
  );

  /* ── PHASE 3 ─────────────────────────────────── */
  if (session.status === 'phase3') {
    if (!leaderboard || !test) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        {S.spinner()}<p style={{ color: 'var(--text-muted)' }}>{t('calculatingResults')}</p>
      </div>
    );

    const myScore = leaderboard.find(p => p.user_id === currentUserId);
    const getQ = (id: string) => test.questions.find(q => q.id === id)?.text || '';

    return (
      <div className="animate-in fade-in duration-500" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 64 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Trophy style={{ width: 56, height: 56, color: 'var(--gold)', margin: '0 auto 16px' }} />
          <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2.5rem', fontWeight: 500, marginBottom: 8 }}>
            {t('finalResults')}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('finalResultsSubtitle')}</p>
        </div>

        {/* Leaderboard */}
        <div className="paper-card" style={{ overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Medal style={{ width: 18, height: 18, color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>{t('leaderboard')}</span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {leaderboard.map((player, i) => {
              const isMe = player.user_id === currentUserId;
              const podiumBg = i === 0 ? '#fef9e8' : i === 1 ? '#f5f5f5' : i === 2 ? '#fef3e8' : 'var(--bg-subtle)';
              const podiumBorder = i === 0 ? '#f0d060' : i === 1 ? '#c0c0c0' : i === 2 ? '#d4906a' : 'var(--border-muted)';
              return (
                <div key={player.user_id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', borderRadius: 10,
                  background: podiumBg, border: `1px solid ${podiumBorder}`,
                  outline: isMe ? '2px solid var(--accent)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: i === 0 ? 'var(--gold)' : 'var(--bg-card)',
                      border: '1px solid var(--border-default)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: i === 0 ? '#fff' : 'var(--text-secondary)',
                    }}>
                      {i === 0 ? <Crown style={{ width: 16, height: 16 }} /> : i + 1}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>
                      {player.name}
                      {isMe && <span style={{ color: 'var(--accent)', fontWeight: 400, fontSize: '0.8rem', marginLeft: 6 }}>({t('you')})</span>}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{player.score}</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: -2 }}>{t('points')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakdown */}
        {myScore && myScore.matches.length > 0 && (
          <div className="paper-card" style={{ overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-muted)', background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users style={{ width: 18, height: 18, color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600 }}>{t('yourBreakdown')}</span>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {myScore.matches.map((m, idx) => (
                <div key={idx} style={{
                  padding: '16px 18px', borderRadius: 10,
                  background: m.is_correct ? '#f0faf4' : '#fdf4f2',
                  border: `1px solid ${m.is_correct ? '#a8d8b8' : '#e8c0b8'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    {m.is_correct
                      ? <CheckCircle2 style={{ width: 16, height: 16, color: 'var(--success)', flexShrink: 0 }} />
                      : <XCircle style={{ width: 16, height: 16, color: 'var(--error)', flexShrink: 0 }} />}
                    <strong style={{ fontSize: '0.9rem' }}>{t('about')} {m.target_name}</strong>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 10 }}>{getQ(m.question_id)}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: t('yourGuess'), val: m.guessed_answer, ok: m.is_correct },
                      { label: t('realAnswer'), val: m.correct_answer, ok: true },
                    ].map(({ label, val, ok }) => (
                      <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-muted)', borderRadius: 8, padding: '10px 12px' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>{label}</span>
                        <span style={{ fontWeight: 600, color: ok ? 'var(--text-primary)' : 'var(--error)' }}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <button className="btn-ghost" onClick={() => router.push('/')} style={{ padding: '14px 32px', fontSize: '1rem' }}>
            {t('backToHomeAndPlayAgain')}
          </button>
        </div>
      </div>
    );
  }

  /* ── PHASE 2 ─────────────────────────────────── */
  if (session.status === 'phase2') {
    if (phase2Loading || !test) return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
        {S.spinner()}<p style={{ color: 'var(--text-muted)' }}>{t('preparingRound')}</p>
      </div>
    );

    const others = session.participants.filter(p => p.id !== currentUserId);
    const allDone = others.every(p => completedTargets.includes(p.id));

    if (allDone) return (
      <div className="paper-card anim-scale-in" style={{ padding: 56, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
        <CheckCircle style={{ width: 52, height: 52, color: 'var(--success)', margin: '0 auto 20px' }} />
        <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.75rem', marginBottom: 10 }}>{t('roundCompleted')}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>{t('roundCompletedSubtitle')}</p>
        {S.waitBox(t('waitingForOthers'))}
      </div>
    );

    if (!currentTargetId) return (
      <div className="animate-in fade-in duration-500" style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          {S.badge(t('phase2Title'), true)}
          <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2.25rem', fontWeight: 500, marginBottom: 8 }}>{t('selectPlayer')}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('selectPlayerSubtitle')}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {others.map(p => {
            const done = completedTargets.includes(p.id);
            return (
              <button key={p.id} id={`btn-guess-${p.id}`} onClick={() => !done && setCurrentTargetId(p.id)} disabled={done}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 22px', borderRadius: 12, cursor: done ? 'not-allowed' : 'pointer',
                  background: done ? 'var(--bg-subtle)' : 'var(--bg-card)',
                  border: `1px solid ${done ? 'var(--border-muted)' : 'var(--border-default)'}`,
                  opacity: done ? 0.6 : 1,
                  transition: 'all 0.15s', width: '100%',
                  boxShadow: done ? 'none' : 'var(--shadow-sm)',
                }}
                onMouseEnter={e => !done && ((e.currentTarget.style.borderColor = 'var(--accent)'), (e.currentTarget.style.transform = 'translateY(-1px)'))}
                onMouseLeave={e => !done && ((e.currentTarget.style.borderColor = 'var(--border-default)'), (e.currentTarget.style.transform = 'none'))}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    <UserCircle2 style={{ width: 22, height: 22 }} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '1rem' }}>{p.name}</span>
                </div>
                {done
                  ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)' }}><CheckCircle style={{ width: 18, height: 18 }} /><span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('completed')}</span></div>
                  : <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>{t('guess')} →</span>
                }
              </button>
            );
          })}
        </div>
      </div>
    );

    const targetUser = session.participants.find(p => p.id === currentTargetId);
    return (
      <div className="animate-in fade-in duration-500" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', position: 'relative', marginBottom: 36 }}>
          <button onClick={() => { setCurrentTargetId(null); setAnswers({}); }}
            style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', padding: 8, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <ArrowLeft style={{ width: 22, height: 22 }} />
          </button>
          {S.badge(t('phase2'), true)}
          <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2rem', fontWeight: 500, marginBottom: 6 }}>{t('guessingAbout')} {targetUser?.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{t('guessInstructions', { name: targetUser?.name || '' })}</p>
        </div>
        <QuestionForm questions={test.questions} answers={answers} onChange={handleAnswerChange}
          onSubmit={handleSubmitPhase2} isSubmitting={isSubmitting} submitLabel={t('confirmAnswers')}
          placeholderFn={(q) => q.type === 'free_response' ? t('typeYourGuess', { name: targetUser?.name || '' }) : ''} />
      </div>
    );
  }

  /* ── PHASE 1 ─────────────────────────────────── */
  if (!test) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 64 }}>
      {S.spinner()}<p style={{ color: 'var(--text-muted)' }}>{t('loadingQuestions')}</p>
    </div>
  );

  if (hasSubmitted) return (
    <div className="paper-card anim-scale-in" style={{ padding: 56, textAlign: 'center', maxWidth: 400, margin: '0 auto' }}>
      <CheckCircle style={{ width: 52, height: 52, color: 'var(--success)', margin: '0 auto 20px' }} />
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.75rem', marginBottom: 10 }}>{t('answersSubmitted')}</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>{t('answersSubmittedSubtitle')}</p>
      {S.waitBox(t('waitingForOthers'))}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500" style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        {S.badge(t('phase1'))}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2rem', fontWeight: 500, marginBottom: 6 }}>{test.title}</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '40ch', margin: '0 auto' }}>{t('phase1Instructions')}</p>
      </div>
      <QuestionForm questions={test.questions} answers={answers} onChange={handleAnswerChange}
        onSubmit={handleSubmitPhase1} isSubmitting={isSubmitting} submitLabel={t('confirmAnswers')}
        placeholderFn={() => t('typeYourAnswer')} />
    </div>
  );
}

/* ── QuestionForm shared component ───────────────── */
function QuestionForm({ questions, answers, onChange, onSubmit, isSubmitting, submitLabel, placeholderFn }: {
  questions: Question[];
  answers: Record<string, string>;
  onChange: (id: string, val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  submitLabel: string;
  placeholderFn: (q: Question) => string;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 48 }}>
      {questions.map((q, i) => (
        <div key={q.id} className="paper-card" style={{ padding: '28px 28px 24px' }}>
          <h3 style={{ fontWeight: 600, fontSize: '1.0625rem', marginBottom: 18, display: 'flex', gap: 10, color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 24 }}>{i + 1}.</span>
            {q.text}
          </h3>

          {q.type === 'multiple_choice' && q.options && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {q.options.map((opt, oi) => {
                const sel = answers[q.id] === opt;
                return (
                  <label key={oi} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 16px', borderRadius: 10, cursor: 'pointer',
                    background: sel ? 'var(--accent-light)' : 'var(--bg-subtle)',
                    border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border-muted)'}`,
                    transition: 'all 0.15s',
                  }}>
                    <input type="radio" name={q.id} value={opt} checked={sel}
                      onChange={e => onChange(q.id, e.target.value)} style={{ display: 'none' }} />
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${sel ? 'var(--accent)' : 'var(--border-strong)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />}
                    </div>
                    <span style={{ fontWeight: sel ? 600 : 400, color: sel ? 'var(--accent)' : 'var(--text-primary)', fontSize: '0.9375rem' }}>{opt}</span>
                  </label>
                );
              })}
            </div>
          )}

          {q.type === 'free_response' && (
            <textarea rows={3} placeholder={placeholderFn(q)} value={answers[q.id] || ''}
              onChange={e => onChange(q.id, e.target.value)}
              style={{
                width: '100%', padding: '12px 14px', resize: 'none',
                background: 'var(--bg-input)', border: '1px solid var(--border-default)',
                borderRadius: 10, fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                color: 'var(--text-primary)', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent)', e.target.style.boxShadow = '0 0 0 3px rgba(196,82,58,0.12)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-default)', e.target.style.boxShadow = 'none')}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button id="btn-submit-answers" type="submit" disabled={isSubmitting} className="btn-primary"
          style={{ padding: '14px 40px', fontSize: '1rem', gap: 10 }}>
          {isSubmitting
            ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} />
            : <>{submitLabel} <Send style={{ width: 16, height: 16 }} /></>
          }
        </button>
      </div>
    </form>
  );
}
