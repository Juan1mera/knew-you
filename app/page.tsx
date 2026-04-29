'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSession, joinSessionByCode } from '@/src/lib/services/session';
import { Users, Plus, KeyRound, Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
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
      // We can store the user's ID in localStorage or state management in a real app
      localStorage.setItem('knewyou_user_id', hostId);
      localStorage.setItem('knewyou_user_name', name);
      
      router.push(`/lobby/${sessionId}`);
    } catch (err) {
      console.error(err);
      setError('Error al crear la sesión. Intenta de nuevo.');
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
        setError('Código de sesión inválido.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Error al unirse a la sesión.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-600/30 rounded-full blur-[128px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary-500/20 rounded-full blur-[128px]"></div>
      </div>

      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <h1 className="text-6xl font-black tracking-tighter text-gradient mb-4">
            KnewYou
          </h1>
          <p className="text-slate-400 text-lg">
            ¿Qué tanto te conocen tus amigos?
          </p>
        </div>

        <div className="glass-card p-8">
          <div className="flex p-1 bg-white/5 rounded-xl mb-8">
            <button
              onClick={() => { setActiveTab('join'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'join' 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unirse
            </button>
            <button
              onClick={() => { setActiveTab('create'); setError(''); }}
              className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
                activeTab === 'create' 
                  ? 'bg-white/10 text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Crear Juego
            </button>
          </div>

          {activeTab === 'join' ? (
            <form onSubmit={handleJoin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tu Nombre
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm"
                    placeholder="Ej. Carlos"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Código de la Sesión
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm uppercase"
                    placeholder="Ej. A8F3B"
                    maxLength={6}
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading || !name.trim() || !sessionCode.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Entrar a la Sala'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tu Nombre (Host)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl leading-5 bg-black/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all sm:text-sm"
                    placeholder="Ej. Carlos"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Crear Nueva Sesión
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
