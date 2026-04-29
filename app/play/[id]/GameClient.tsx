'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSession, updateSessionStatus } from '@/src/lib/services/session';
import { getTestById, submitAnswers, checkPhase1Completion } from '@/src/lib/services/test';
import { Session, Test, Question } from '@/src/types';
import { Loader2, AlertCircle, CheckCircle, Send, Users } from 'lucide-react';

export default function GameClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [test, setTest] = useState<Test | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Phase 1 specific state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const storedId = localStorage.getItem('knewyou_user_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(storedId);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToSession(sessionId, async (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
        
        // Fetch test if we don't have it yet and session has a test_id
        if (sessionData.test_id && !test) {
          const testData = await getTestById(sessionData.test_id);
          setTest(testData);
        }

        // If everyone submitted, status will change to phase2
        if (sessionData.status === 'phase2') {
          // Future phase 2 implementation will handle this, but for now just stay or show a message
          setLoading(false);
        } else {
          setLoading(false);
        }

      } else {
        setError('Sesión no encontrada o ha sido eliminada.');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [sessionId, test]);

  // Listener logic for the host to check if everyone is done with Phase 1
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;
    
    if (
      session && 
      session.status === 'phase1' && 
      test && 
      currentUserId === session.host_id
    ) {
      // The host periodically checks if everyone submitted their answers
      // Using an interval instead of a real-time listener on `answers` collection to save reads,
      // or we could listen to a count if we increment a counter. We'll just poll every 3 seconds.
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
          console.error('Error checking phase completion', e);
        }
      }, 3000);
    }

    return () => clearInterval(checkInterval);
  }, [session, test, currentUserId, sessionId]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!test || !currentUserId) return;
    
    // Validate all questions answered
    const unanswered = test.questions.filter(q => !answers[q.id]);
    if (unanswered.length > 0) {
      alert('Por favor responde todas las preguntas.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Target user id is same as user id in self-evaluation (Phase 1)
      await submitAnswers(sessionId, currentUserId, currentUserId, answers);
      setHasSubmitted(true);
    } catch (err) {
      console.error(err);
      alert('Hubo un error al enviar tus respuestas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando partida...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  // --- RENDERING PHASE 2 PLACEHOLDER ---
  if (session.status === 'phase2') {
    return (
      <div className="glass-card p-12 text-center animate-in zoom-in duration-500 max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-primary-500/20 text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="w-10 h-10" />
        </div>
        <h1 className="text-4xl font-black text-white mb-4">¡Fase 2: Sobre Ellos!</h1>
        <p className="text-lg text-slate-300">
          Todos han terminado la Autoevaluación. Ahora es momento de adivinar las respuestas de los demás.
          <br /><br />
          <span className="text-primary-400 font-semibold">(El desarrollo de esta pantalla continuará en el próximo paso).</span>
        </p>
      </div>
    );
  }

  // --- RENDERING PHASE 1 ---
  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando preguntas...</p>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="glass-card p-12 text-center animate-in zoom-in duration-500 max-w-md mx-auto">
        <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
        <h2 className="text-3xl font-black text-white mb-4">¡Respuestas Enviadas!</h2>
        <p className="text-slate-300 mb-8">
          Tus respuestas están guardadas de forma segura. Por favor, espera a que los demás jugadores terminen para avanzar a la siguiente fase.
        </p>
        <div className="flex justify-center items-center gap-3 text-primary-400 bg-primary-500/10 py-3 px-6 rounded-xl w-max mx-auto">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-semibold">Esperando a los demás...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary-500/20 text-primary-300 font-bold text-sm tracking-wider uppercase mb-4 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
          Fase 1: Autoevaluación
        </span>
        <h1 className="text-4xl font-black text-white mb-2">{test.title}</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Responde a las siguientes preguntas pensando única y exclusivamente en **ti mismo**. Más adelante, los demás tendrán que adivinar qué respondiste aquí. ¡Sé honesto!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
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
                placeholder="Escribe tu respuesta aquí..."
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
                Confirmar mis respuestas
                <Send className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
