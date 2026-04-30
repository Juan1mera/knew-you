'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSession, updateSessionStatus } from '@/src/lib/services/session';
import { 
  getTestById, 
  submitAnswers, 
  checkPhase1Completion, 
  checkPhase2Completion,
  getCompletedTargetsForUser,
  calculateResults
} from '@/src/lib/services/test';
import { Session, Test, Question, PlayerScore } from '@/src/types';
import { Loader2, AlertCircle, CheckCircle, Send, Users, UserCircle2, ArrowLeft, Trophy, Crown, Medal, XCircle, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/src/lib/i18n';

export default function GameClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [session, setSession] = useState<Session | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Phase 1 specific state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Phase 2 specific state
  const [completedTargets, setCompletedTargets] = useState<string[]>([]);
  const [currentTargetId, setCurrentTargetId] = useState<string | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);

  // Phase 3 specific state
  const [leaderboard, setLeaderboard] = useState<PlayerScore[] | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('knewyou_user_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(storedId);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSession(sessionId, async (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
        
        if (sessionData.test_id && !test) {
          const testData = await getTestById(sessionData.test_id);
          setTest(testData);
        }

        setLoading(false);
      } else {
        setError(t('sessionNotFound'));
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [sessionId, test]);

  // Load completed targets when phase 2 starts
  useEffect(() => {
    const loadPhase2Data = async () => {
      if (session?.status === 'phase2' && currentUserId) {
        setPhase2Loading(true);
        try {
          const targets = await getCompletedTargetsForUser(sessionId, currentUserId);
          setCompletedTargets(targets);
        } catch (e) {
          console.error("Error loading completed targets", e);
        } finally {
          setPhase2Loading(false);
        }
      }
    };
    loadPhase2Data();
  }, [session?.status, currentUserId, sessionId]);

  // Load results when phase 3 starts
  useEffect(() => {
    const fetchResults = async () => {
      if (session?.status === 'phase3' && session.participants.length > 0) {
        try {
          const results = await calculateResults(sessionId, session.participants);
          setLeaderboard(results);
        } catch (e) {
          console.error("Error calculating results", e);
        }
      }
    };
    fetchResults();
  }, [session?.status, sessionId, session?.participants]);

  // Host checker for Phase 1 completion
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    if (session?.status === 'phase1' && test && currentUserId === session.host_id) {
      checkInterval = setInterval(async () => {
        try {
          const isComplete = await checkPhase1Completion(
            sessionId, 
            session.participants.length, 
            test.questions.length
          );
          if (isComplete) {
            await updateSessionStatus(sessionId, 'phase2');
            clearInterval(checkInterval);
          }
        } catch (e) {
          console.error('Error checking phase 1 completion', e);
        }
      }, 3000);
    }
    return () => clearInterval(checkInterval);
  }, [session, test, currentUserId, sessionId]);

  // Host checker for Phase 2 completion
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    if (session?.status === 'phase2' && test && currentUserId === session.host_id) {
      checkInterval = setInterval(async () => {
        try {
          const isComplete = await checkPhase2Completion(
            sessionId, 
            session.participants.length, 
            test.questions.length
          );
          if (isComplete) {
            await updateSessionStatus(sessionId, 'phase3');
            clearInterval(checkInterval);
          }
        } catch (e) {
          console.error('Error checking phase 2 completion', e);
        }
      }, 3000);
    }
    return () => clearInterval(checkInterval);
  }, [session, test, currentUserId, sessionId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmitPhase1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !currentUserId) return;
    
    const unanswered = test.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(t('pleaseAnswerAll'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAnswers(sessionId, currentUserId, currentUserId, answers);
      setHasSubmitted(true);
    } catch (err) {
      console.error(err);
      alert(t('errorSubmitting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPhase2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !currentUserId || !currentTargetId) return;
    
    const unanswered = test.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert(t('pleaseAnswerAll'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAnswers(sessionId, currentUserId, currentTargetId, answers);
      setCompletedTargets(prev => [...prev, currentTargetId]);
      setCurrentTargetId(null);
      setAnswers({}); // reset answers for the next target
    } catch (err) {
      console.error(err);
      alert(t('errorSubmitting'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">{t('loadingGame')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{t('error')}</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
        >
          {t('backToHome')}
        </button>
      </div>
    );
  }

  // --- RENDERING PHASE 3 ---
  if (session.status === 'phase3') {
    if (!leaderboard || !test) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p className="text-slate-400 font-medium">{t('calculatingResults')}</p>
        </div>
      );
    }

    const myScore = leaderboard.find(p => p.user_id === currentUserId);
    const getQuestionText = (qId: string) => test.questions.find(q => q.id === qId)?.text || 'Pregunta';

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-12 pb-12">
        <div className="text-center">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
          <h1 className="text-5xl font-black text-white mb-4">{t('finalResults')}</h1>
          <p className="text-xl text-slate-300">
            {t('finalResultsSubtitle')}
          </p>
        </div>

        {/* Leaderboard */}
        <div className="glass-card overflow-hidden">
          <div className="bg-white/5 px-6 py-4 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Medal className="w-6 h-6 text-primary-400" />
              {t('leaderboard')}
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {leaderboard.map((player, index) => (
                <div 
                  key={player.user_id} 
                  className={`
                    relative overflow-hidden flex items-center justify-between p-4 rounded-xl border transition-all
                    ${index === 0 
                      ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
                      : index === 1
                        ? 'bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-300/30'
                        : index === 2
                          ? 'bg-gradient-to-r from-orange-700/20 to-orange-800/20 border-orange-700/30'
                          : 'bg-white/5 border-white/5'
                    }
                    ${player.user_id === currentUserId ? 'ring-2 ring-primary-500' : ''}
                  `}
                >
                  <div className="flex items-center gap-4 z-10">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                      ${index === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'}
                    `}>
                      {index === 0 ? <Crown className="w-5 h-5" /> : index + 1}
                    </div>
                    <div>
                      <span className="text-xl font-bold text-white block">
                        {player.name} {player.user_id === currentUserId && <span className="text-sm font-normal text-primary-300 ml-2">({t('you')})</span>}
                      </span>
                    </div>
                  </div>
                  <div className="z-10 text-right">
                    <span className="text-3xl font-black text-white">{player.score}</span>
                    <span className="text-sm text-slate-400 block -mt-1">{t('points')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        {myScore && myScore.matches.length > 0 && (
          <div className="glass-card overflow-hidden">
            <div className="bg-white/5 px-6 py-4 border-b border-white/5">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Users className="w-6 h-6 text-secondary-400" />
                {t('yourBreakdown')}
              </h2>
            </div>
            <div className="p-6">
              <div className="grid gap-4">
                {myScore.matches.map((match, idx) => (
                  <div 
                    key={idx} 
                    className={`
                      p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4
                      ${match.is_correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}
                    `}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {match.is_correct ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        )}
                        <h4 className="font-bold text-white">{t('about')} {match.target_name}</h4>
                      </div>
                      <p className="text-slate-300 text-sm mb-3">
                        {getQuestionText(match.question_id)}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">{t('yourGuess')}</span>
                          <span className={`font-medium ${match.is_correct ? 'text-green-300' : 'text-red-300'}`}>
                            {match.guessed_answer}
                          </span>
                        </div>
                        <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                          <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">{t('realAnswer')}</span>
                          <span className="font-medium text-white">
                            {match.correct_answer}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center pt-8">
          <button 
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center py-4 px-10 border border-white/10 rounded-xl text-lg font-bold text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            {t('backToHomeAndPlayAgain')}
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERING PHASE 2 ---
  if (session.status === 'phase2') {
    if (phase2Loading || !test) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
          <p className="text-slate-400 font-medium">{t('preparingRound')}</p>
        </div>
      );
    }

    const otherParticipants = session.participants.filter(p => p.id !== currentUserId);
    const allCompleted = otherParticipants.every(p => completedTargets.includes(p.id));

    if (allCompleted) {
      return (
        <div className="glass-card p-12 text-center animate-in zoom-in duration-500 max-w-md mx-auto">
          <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-white mb-4">{t('roundCompleted')}</h2>
          <p className="text-slate-300 mb-8">
            {t('roundCompletedSubtitle')}
          </p>
          <div className="flex justify-center items-center gap-3 text-primary-400 bg-primary-500/10 py-3 px-6 rounded-xl w-max mx-auto">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-semibold">{t('waitingForOthers')}</span>
          </div>
        </div>
      );
    }

    if (!currentTargetId) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-secondary-500/20 text-secondary-300 font-bold text-sm tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
              {t('phase2Title')}
            </span>
            <h1 className="text-4xl font-black text-white mb-2">{t('selectPlayer')}</h1>
            <p className="text-lg text-slate-400">
              {t('selectPlayerSubtitle')}
            </p>
          </div>

          <div className="grid gap-4">
            {otherParticipants.map(p => {
              const isDone = completedTargets.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => !isDone && setCurrentTargetId(p.id)}
                  disabled={isDone}
                  className={`
                    w-full p-6 rounded-2xl flex items-center justify-between transition-all border
                    ${isDone 
                      ? 'bg-white/5 border-white/5 opacity-60 cursor-not-allowed' 
                      : 'glass-card hover:-translate-y-1 hover:shadow-primary-500/20 hover:border-primary-500/50 cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white">
                      <UserCircle2 className="w-7 h-7" />
                    </div>
                    <span className="text-xl font-bold text-white">{p.name}</span>
                  </div>
                  {isDone ? (
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-semibold hidden sm:inline">{t('completed')}</span>
                    </div>
                  ) : (
                    <span className="text-primary-400 font-semibold">{t('guess')}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // Guessing form
    const targetUser = session.participants.find(p => p.id === currentTargetId);
    
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="mb-8 text-center relative max-w-3xl mx-auto">
          <button 
            onClick={() => {
              setCurrentTargetId(null);
              setAnswers({});
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary-500/20 text-secondary-300 font-bold text-sm tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            {t('phase2')}
          </span>
          <h1 className="text-4xl font-black text-white mb-2">{t('guessingAbout')} {targetUser?.name}</h1>
          <p className="text-lg text-slate-400">
            {t('guessInstructions', { name: targetUser?.name || '' })}
          </p>
        </div>

        <form onSubmit={handleSubmitPhase2} className="space-y-6 max-w-3xl mx-auto">
          {test.questions.map((question: Question, index: number) => (
            <div key={question.id} className="glass-card p-6 md:p-8">
              <h3 className="text-xl font-bold text-white mb-6 flex gap-3">
                <span className="text-primary-400">{index + 1}.</span> 
                {question.text}
              </h3>
              
              {question.type === 'multiple_choice' && question.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((option, optIdx) => (
                    <label 
                      key={optIdx} 
                      className={`
                        cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3
                        ${answers[question.id] === option 
                          ? 'bg-primary-600 border-primary-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                          : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                        }
                      `}
                    >
                      <input 
                        type="radio" 
                        name={question.id} 
                        value={option}
                        checked={answers[question.id] === option}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        className="hidden"
                      />
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                        ${answers[question.id] === option ? 'border-white' : 'border-slate-500'}
                      `}>
                        {answers[question.id] === option && <div className="w-3 h-3 bg-white rounded-full"></div>}
                      </div>
                      <span className={`font-medium ${answers[question.id] === option ? 'text-white' : 'text-slate-300'}`}>
                        {option}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'free_response' && (
                <textarea
                  rows={3}
                  placeholder={t('typeYourGuess', { name: targetUser?.name || '' })}
                  value={answers[question.id] || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="w-full p-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                />
              )}
            </div>
          ))}

          <div className="pt-6 pb-12">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto mx-auto flex items-center justify-center py-4 px-10 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-lg font-bold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  {t('confirmAnswers')}
                  <Send className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // --- RENDERING PHASE 1 ---
  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">{t('loadingQuestions')}</p>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="glass-card p-12 text-center animate-in zoom-in duration-500 max-w-md mx-auto">
        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-white mb-4">{t('answersSubmitted')}</h2>
        <p className="text-slate-300 mb-8">
          {t('answersSubmittedSubtitle')}
        </p>
        <div className="flex justify-center items-center gap-3 text-primary-400 bg-primary-500/10 py-3 px-6 rounded-xl w-max mx-auto">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-semibold">{t('waitingForOthers')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/20 text-primary-300 font-bold text-sm tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          {t('phase1')}
        </span>
        <h1 className="text-4xl font-black text-white mb-2">{test.title}</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          {t('phase1Instructions')}
        </p>
      </div>

      <form onSubmit={handleSubmitPhase1} className="space-y-6 max-w-3xl mx-auto">
        {test.questions.map((question: Question, index: number) => (
          <div key={question.id} className="glass-card p-6 md:p-8">
            <h3 className="text-xl font-bold text-white mb-6 flex gap-3">
              <span className="text-primary-400">{index + 1}.</span> 
              {question.text}
            </h3>
            
            {question.type === 'multiple_choice' && question.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options.map((option, optIdx) => (
                  <label 
                    key={optIdx} 
                    className={`
                      cursor-pointer p-4 rounded-xl border transition-all flex items-center gap-3
                      ${answers[question.id] === option 
                        ? 'bg-primary-600 border-primary-500 shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                        : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10'
                      }
                    `}
                  >
                    <input 
                      type="radio" 
                      name={question.id} 
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="hidden"
                    />
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0
                      ${answers[question.id] === option ? 'border-white' : 'border-slate-500'}
                    `}>
                      {answers[question.id] === option && <div className="w-3 h-3 bg-white rounded-full"></div>}
                    </div>
                    <span className={`font-medium ${answers[question.id] === option ? 'text-white' : 'text-slate-300'}`}>
                      {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {question.type === 'free_response' && (
              <textarea
                rows={3}
                placeholder={t('typeYourAnswer')}
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                className="w-full p-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              />
            )}
          </div>
        ))}

        <div className="pt-6 pb-12">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full md:w-auto mx-auto flex items-center justify-center py-4 px-10 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-lg font-bold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                {t('confirmAnswers')}
                <Send className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
