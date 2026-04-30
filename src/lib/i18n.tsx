'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'es' | 'ru';

type Dictionary = Record<string, string>;

const dictionaries: Record<Language, Dictionary> = {
  es: {
    subtitle: '¿Qué tanto te conocen tus amigos?',
    join: 'Unirse',
    createGame: 'Crear Juego',
    yourName: 'Tu Nombre',
    yourNameHost: 'Tu Nombre (Host)',
    namePlaceholder: 'Ej. Carlos',
    sessionCode: 'Código de la Sesión',
    codePlaceholder: 'Ej. A8F3B',
    enterRoom: 'Entrar a la Sala',
    createNewSession: 'Crear Nueva Sesión',
    errorCreateSession: 'Error al crear la sesión. Intenta de nuevo.',
    errorJoinSession: 'Error al unirse a la sesión.',
    invalidSessionCode: 'Código de sesión inválido.',
    lobbyTitle: 'Sala de Espera',
    lobbySubtitle: 'Esperando a que los demás jugadores se unan...',
    inviteCode: 'Código de Invitación',
    players: 'Jugadores',
    connected: 'conectados',
    you: 'Tú',
    host: 'Host',
    startGame: 'Comenzar Juego (Fase 1)',
    waitingForHost: 'Esperando a que el Host inicie el juego...',
    connectingToRoom: 'Conectando a la sala...',
    sessionNotFound: 'Sesión no encontrada o ha sido eliminada.',
    error: 'Error',
    errorStartGame: 'Error al iniciar el juego.',
    backToHome: 'Volver al Inicio',
    loadingGame: 'Cargando partida...',
    calculatingResults: 'Calculando resultados...',
    finalResults: 'Resultados Finales',
    finalResultsSubtitle: 'Veamos quién conoce mejor al grupo.',
    leaderboard: 'Tabla de Posiciones',
    points: 'Puntos',
    yourBreakdown: 'Tu Desglose',
    about: 'Sobre',
    yourGuess: 'Tu Adivinanza',
    realAnswer: 'Respuesta Real',
    backToHomeAndPlayAgain: 'Volver al Inicio y Jugar de Nuevo',
    preparingRound: 'Preparando ronda...',
    roundCompleted: '¡Ronda Completada!',
    roundCompletedSubtitle: 'Has adivinado las respuestas de todos. Esperando a que el resto de jugadores termine...',
    waitingForOthers: 'Esperando a los demás...',
    phase2: 'Fase 2',
    phase2Title: 'Fase 2: Conociendo a los Demás',
    selectPlayer: 'Selecciona un Jugador',
    selectPlayerSubtitle: 'Elige a uno de tus amigos para adivinar qué respondió en su test de autoevaluación.',
    guess: 'Adivinar',
    completed: 'Completado',
    guessingAbout: 'Adivinando sobre',
    guessInstructions: '¿Qué crees que respondió {name}? ¡Trata de ponerte en sus zapatos!',
    confirmAnswers: 'Confirmar mis respuestas',
    phase1: 'Fase 1: Autoevaluación',
    phase1Instructions: 'Responde a las siguientes preguntas pensando única y exclusivamente en **ti mismo**. Más adelante, los demás tendrán que adivinar qué respondiste aquí. ¡Sé honesto!',
    pleaseAnswerAll: 'Por favor responde todas las preguntas.',
    errorSubmitting: 'Hubo un error al enviar tus respuestas.',
    answersSubmitted: '¡Respuestas Enviadas!',
    answersSubmittedSubtitle: 'Tus respuestas están guardadas de forma segura. Por favor, espera a que los demás jugadores terminen para avanzar a la siguiente fase.',
    typeYourAnswer: 'Escribe tu respuesta aquí...',
    typeYourGuess: 'Escribe lo que crees que {name} respondió...',
    loadingQuestions: 'Cargando preguntas...',
  },
  ru: {
    subtitle: 'Как хорошо твои друзья знают тебя?',
    join: 'Присоединиться',
    createGame: 'Создать игру',
    yourName: 'Твое имя',
    yourNameHost: 'Твое имя (Хост)',
    namePlaceholder: 'Напр. Иван',
    sessionCode: 'Код сессии',
    codePlaceholder: 'Напр. A8F3B',
    enterRoom: 'Войти в комнату',
    createNewSession: 'Создать новую сессию',
    errorCreateSession: 'Ошибка при создании сессии. Попробуйте снова.',
    errorJoinSession: 'Ошибка при присоединении к сессии.',
    invalidSessionCode: 'Неверный код сессии.',
    lobbyTitle: 'Зал ожидания',
    lobbySubtitle: 'Ожидание присоединения остальных игроков...',
    inviteCode: 'Код приглашения',
    players: 'Игроки',
    connected: 'подключено',
    you: 'Ты',
    host: 'Хост',
    startGame: 'Начать игру (Фаза 1)',
    waitingForHost: 'Ожидание запуска игры Хостом...',
    connectingToRoom: 'Подключение к комнате...',
    sessionNotFound: 'Сессия не найдена или была удалена.',
    error: 'Ошибка',
    errorStartGame: 'Ошибка при запуске игры.',
    backToHome: 'Вернуться на главную',
    loadingGame: 'Загрузка игры...',
    calculatingResults: 'Подсчет результатов...',
    finalResults: 'Финальные результаты',
    finalResultsSubtitle: 'Давайте посмотрим, кто лучше всех знает группу.',
    leaderboard: 'Таблица лидеров',
    points: 'Очков',
    yourBreakdown: 'Ваша детализация',
    about: 'О',
    yourGuess: 'Твоя догадка',
    realAnswer: 'Реальный ответ',
    backToHomeAndPlayAgain: 'Вернуться на главную и сыграть еще',
    preparingRound: 'Подготовка раунда...',
    roundCompleted: 'Раунд завершен!',
    roundCompletedSubtitle: 'Вы угадали ответы всех игроков. Ожидание завершения остальных...',
    waitingForOthers: 'Ожидание остальных...',
    phase2: 'Фаза 2',
    phase2Title: 'Фаза 2: Узнаем других',
    selectPlayer: 'Выберите игрока',
    selectPlayerSubtitle: 'Выберите одного из друзей, чтобы угадать, что он ответил в своем тесте самооценки.',
    guess: 'Угадать',
    completed: 'Завершено',
    guessingAbout: 'Угадываем про',
    guessInstructions: 'Как ты думаешь, что ответил(а) {name}? Постарайся поставить себя на его/ее место!',
    confirmAnswers: 'Подтвердить мои ответы',
    phase1: 'Фаза 1: Самооценка',
    phase1Instructions: 'Отвечай на следующие вопросы, думая исключительно о **себе**. Позже другим придется угадывать, что ты ответил(а). Будь честен!',
    pleaseAnswerAll: 'Пожалуйста, ответьте на все вопросы.',
    errorSubmitting: 'Произошла ошибка при отправке ваших ответов.',
    answersSubmitted: 'Ответы отправлены!',
    answersSubmittedSubtitle: 'Ваши ответы надежно сохранены. Пожалуйста, подождите, пока остальные игроки закончат, чтобы перейти к следующей фазе.',
    typeYourAnswer: 'Напишите свой ответ здесь...',
    typeYourGuess: 'Напишите, что по-вашему ответил(а) {name}...',
    loadingQuestions: 'Загрузка вопросов...',
  }
};

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, variables?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('es');

  useEffect(() => {
    const storedLang = localStorage.getItem('knewyou_language') as Language;
    if (storedLang && (storedLang === 'es' || storedLang === 'ru')) {
      setLanguage(storedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('knewyou_language', lang);
  };

  const t = (key: string, variables?: Record<string, string>): string => {
    let text = dictionaries[language][key] || dictionaries['es'][key] || key;
    
    if (variables) {
      Object.keys(variables).forEach(vKey => {
        text = text.replace(`{${vKey}}`, variables[vKey]);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
