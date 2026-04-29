'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { subscribeToSession, startGame } from '@/src/lib/services/session';
import { Session, Participant } from '@/src/types';
import { Users, Copy, CheckCircle2, Play, AlertCircle, Crown, User } from 'lucide-react';

export default function LobbyClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get current user id from localStorage
    const storedId = localStorage.getItem('knewyou_user_id');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentUserId(storedId);
  }, []);

  useEffect(() => {

    const unsubscribe = subscribeToSession(sessionId, (sessionData) => {
      if (sessionData) {
        setSession(sessionData);
      } else {
        setError('Sesión no encontrada o ha sido eliminada.');
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
      setError('Error al iniciar el juego.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Conectando a la sala...</p>
      </div>
    );
  }

  if (error || !session) {
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

  const isHost = currentUserId && session.host_id === currentUserId;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-white mb-2">Sala de Espera</h1>
          <p className="text-slate-400">
            Esperando a que los demás jugadores se unan...
          </p>
        </div>

        <div className="glass px-6 py-4 rounded-2xl flex flex-col items-center min-w-[200px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Código de Invitación
          </span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black tracking-widest text-primary-400">
              {session.shortCode}
            </span>
            <button 
              onClick={copyCode}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
              title="Copiar código"
            >
              {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-bold text-white">Jugadores</h2>
          </div>
          <span className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-full text-sm font-semibold">
            {session.participants.length} conectados
          </span>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {session.participants.map((participant: Participant) => {
              const isMe = participant.id === currentUserId;
              
              return (
                <div 
                  key={participant.id} 
                  className={`
                    relative overflow-hidden p-4 rounded-xl border flex items-center gap-3 transition-all
                    ${isMe 
                      ? 'bg-gradient-to-br from-primary-900/40 to-fuchsia-900/40 border-primary-500/50 shadow-[0_0_15px_rgba(139,92,246,0.15)]' 
                      : 'bg-white/5 border-white/10 hover:border-white/20'
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                    ${participant.isHost ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white'}
                  `}>
                    {participant.isHost ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {participant.name}
                      {isMe && <span className="ml-2 text-xs font-normal text-primary-300">(Tú)</span>}
                    </p>
                    {participant.isHost && (
                      <p className="text-xs text-amber-400/80 font-medium">Host</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        {isHost ? (
          <button
            onClick={handleStartGame}
            disabled={session.participants.length < 2}
            className="flex items-center justify-center py-4 px-8 border border-transparent rounded-xl shadow-lg shadow-primary-500/20 text-base font-bold text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
            Comenzar Juego (Fase 1)
          </button>
        ) : (
          <div className="px-6 py-4 glass rounded-xl text-slate-300 flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-primary-500/50 border-t-primary-500 rounded-full animate-spin"></div>
            <span>Esperando a que el Host inicie el juego...</span>
          </div>
        )}
      </div>
    </div>
  );
}
