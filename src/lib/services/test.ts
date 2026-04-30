import { db } from '@/src/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { Test, Answer, Participant, PlayerScore } from '@/src/types';

const DEFAULT_TEST_ID = 'default_test_02';

const defaultTestContent: Test = {
  id: DEFAULT_TEST_ID,
  title: 'Conociéndonos Mejor',
  questions: [
    // ── 1. Básicos ───────────────────────────────────
    {
      id: 'q_color',
      type: 'free_response',
      text: '¿Cuál es tu color favorito?'
    },
    {
      id: 'q_food',
      type: 'free_response',
      text: '¿Cuál es tu comida o plato favorito?'
    },
    {
      id: 'q_place',
      type: 'free_response',
      text: '¿Cuál es tu lugar favorito en el mundo (ciudad, país o rincón especial)?'
    },
    {
      id: 'q_animal',
      type: 'free_response',
      text: '¿Cuál es tu animal favorito?'
    },

    // ── 2. Personalidad y Fantasía ────────────────────
    {
      id: 'q_superpower',
      type: 'multiple_choice',
      text: 'Si pudiera elegir un superpoder, ¿cuál sería?',
      options: [
        'Volar',
        'Invisibilidad',
        'Teletransportación',
        'Leer la mente'
      ]
    },
    {
      id: 'q_travel',
      type: 'free_response',
      text: 'Si tuviera un boleto de avión abierto para cualquier país del mundo, ¿a dónde iría primero?'
    },
    {
      id: 'q_friday',
      type: 'multiple_choice',
      text: '¿Qué prefiero un viernes por la noche?',
      options: [
        'Plan tranquilo: mantita, peli y cena en casa',
        'Salir de casa: fiesta, restaurante o caminar por la ciudad'
      ]
    },

    // ── 3. Gustos y Paladar ───────────────────────────
    {
      id: 'q_flavor',
      type: 'multiple_choice',
      text: 'Entre estos cuatro sabores, ¿cuál es mi top 1?',
      options: [
        'Dulce',
        'Salado',
        'Picante',
        'Ácido'
      ]
    },
    {
      id: 'q_snack',
      type: 'multiple_choice',
      text: '¿Cuál es mi snack ideal para ver una película?',
      options: [
        'Palomitas / Popcorn',
        'Chocolates o Gomitas',
        'Nachos con queso'
      ]
    },
    {
      id: 'q_drink',
      type: 'multiple_choice',
      text: '¿Qué prefiero beber durante la comida?',
      options: [
        'Agua',
        'Refresco / Soda',
        'Jugo natural',
        'Cerveza / Vino'
      ]
    },

    // ── 4. Esto o Aquello ─────────────────────────────
    {
      id: 'q_sleep',
      type: 'multiple_choice',
      text: '¿Madrugar o trasnochar?',
      options: ['Madrugar', 'Trasnochar']
    },
    {
      id: 'q_nature',
      type: 'multiple_choice',
      text: '¿Playa o montaña?',
      options: ['Playa', 'Montaña']
    },
    {
      id: 'q_cook',
      type: 'multiple_choice',
      text: '¿Cocinar o pedir domicilio?',
      options: ['Cocinar', 'Pedir domicilio']
    },
    {
      id: 'q_content',
      type: 'multiple_choice',
      text: '¿Series o películas?',
      options: ['Series', 'Películas']
    },
    {
      id: 'q_pet',
      type: 'multiple_choice',
      text: '¿Perros o gatos?',
      options: ['Perros', 'Gatos']
    },
    {
      id: 'q_book',
      type: 'multiple_choice',
      text: '¿Libro físico o Kindle / Audiolibro?',
      options: ['Libro físico', 'Kindle / Audiolibro']
    },

    // ── 5. El toque de "Expertos" ──────────────────────
    {
      id: 'q_closet',
      type: 'free_response',
      text: '¿Cuál es esa prenda de ropa que tengo en el closet, que casi nunca uso, pero que me niego a tirar?'
    },
    {
      id: 'q_shopping',
      type: 'free_response',
      text: '¿Qué es lo que más me gusta comprar cuando voy a un centro comercial (aunque no lo necesite)?'
    },
    {
      id: 'q_guilty',
      type: 'free_response',
      text: '¿Cuál es mi "gusto culposo"? (Esa canción o película que me da un poco de vergüenza admitir que me encanta)'
    }
  ]
};

/**
 * Gets the default test from Firestore.
 * Always writes the latest local content (upsert) so question changes
 * in code are reflected immediately without manual Firestore edits.
 */
export const getDefaultTest = async (): Promise<Test> => {
  const testRef = doc(db, 'tests', DEFAULT_TEST_ID);
  await setDoc(testRef, defaultTestContent);
  return defaultTestContent;
};

export const getTestById = async (testId: string): Promise<Test | null> => {
  const testRef = doc(db, 'tests', testId);
  const testSnap = await getDoc(testRef);

  if (testSnap.exists()) {
    return testSnap.data() as Test;
  }
  return null;
};

/**
 * Submits answers for a particular user about a target user.
 * In Phase 1, user_id and target_user_id are the same.
 */
export const submitAnswers = async (
  sessionId: string,
  userId: string,
  targetUserId: string,
  answersRecord: Record<string, string> // question_id -> answer_value
) => {
  const batch = [];
  
  for (const [questionId, answerValue] of Object.entries(answersRecord)) {
    // Generate a unique ID for the answer document
    const answerRef = doc(collection(db, 'answers'));
    const answerObj: Answer = {
      id: answerRef.id,
      session_id: sessionId,
      user_id: userId,
      target_user_id: targetUserId,
      question_id: questionId,
      answer_value: answerValue
    };
    batch.push(setDoc(answerRef, answerObj));
  }

  await Promise.all(batch);
};

/**
 * Checks if all participants in a session have submitted their self-evaluation answers.
 */
export const checkPhase1Completion = async (
  sessionId: string,
  participantsCount: number,
  testQuestionCount: number
): Promise<boolean> => {
  // Find all answers for this session where target_user_id == user_id (Self evaluation)
  const q = query(
    collection(db, 'answers'), 
    where('session_id', '==', sessionId)
  );
  const querySnapshot = await getDocs(q);
  
  // We only count answers where user_id === target_user_id
  const selfAnswers = querySnapshot.docs.filter(d => {
    const data = d.data() as Answer;
    return data.user_id === data.target_user_id;
  });

  // Total expected answers = number of participants * number of questions in test
  const totalExpectedAnswers = participantsCount * testQuestionCount;

  return selfAnswers.length >= totalExpectedAnswers;
};

/**
 * Gets the list of target_user_ids that the current user has already guessed for.
 */
export const getCompletedTargetsForUser = async (
  sessionId: string,
  userId: string
): Promise<string[]> => {
  const q = query(
    collection(db, 'answers'),
    where('session_id', '==', sessionId),
    where('user_id', '==', userId)
  );
  
  const querySnapshot = await getDocs(q);
  const targets = new Set<string>();
  
  querySnapshot.forEach(doc => {
    const data = doc.data() as Answer;
    // We only care about Phase 2 answers (guessing others)
    if (data.target_user_id !== userId) {
      targets.add(data.target_user_id);
    }
  });

  return Array.from(targets);
};

/**
 * Checks if all participants in a session have submitted their guesses for EVERY other participant.
 */
export const checkPhase2Completion = async (
  sessionId: string,
  participantsCount: number,
  testQuestionCount: number
): Promise<boolean> => {
  const q = query(
    collection(db, 'answers'), 
    where('session_id', '==', sessionId)
  );
  const querySnapshot = await getDocs(q);
  
  // We only count answers where user_id !== target_user_id (Guessing others)
  const guessAnswers = querySnapshot.docs.filter(d => {
    const data = d.data() as Answer;
    return data.user_id !== data.target_user_id;
  });

  // Total expected guesses = number of participants * (number of participants - 1) * number of questions
  const totalExpectedGuesses = participantsCount * (participantsCount - 1) * testQuestionCount;

  return guessAnswers.length >= totalExpectedGuesses;
};

/**
 * Processes all answers and calculates the final scores for each participant.
 */
export const calculateResults = async (
  sessionId: string,
  participants: Participant[]
): Promise<PlayerScore[]> => {
  const q = query(collection(db, 'answers'), where('session_id', '==', sessionId));
  const querySnapshot = await getDocs(q);
  const allAnswers = querySnapshot.docs.map(d => d.data() as Answer);

  // Map to quickly find self-evaluations (correct answers)
  // Structure: { [target_user_id]: { [question_id]: answer_value } }
  const correctAnswers: Record<string, Record<string, string>> = {};
  
  allAnswers.forEach(ans => {
    if (ans.user_id === ans.target_user_id) {
      if (!correctAnswers[ans.target_user_id]) correctAnswers[ans.target_user_id] = {};
      correctAnswers[ans.target_user_id][ans.question_id] = ans.answer_value;
    }
  });

  const participantMap = new Map<string, Participant>();
  participants.forEach(p => participantMap.set(p.id, p));

  const scoresMap: Record<string, PlayerScore> = {};
  participants.forEach(p => {
    scoresMap[p.id] = {
      user_id: p.id,
      name: p.name,
      score: 0,
      matches: []
    };
  });

  allAnswers.forEach(ans => {
    // We only evaluate guesses (user_id !== target_user_id)
    if (ans.user_id !== ans.target_user_id && scoresMap[ans.user_id]) {
      const correctVal = correctAnswers[ans.target_user_id]?.[ans.question_id];
      if (correctVal !== undefined) {
        // Compare values case-insensitively and trimmed
        const isCorrect = ans.answer_value.trim().toLowerCase() === correctVal.trim().toLowerCase();
        
        if (isCorrect) {
          scoresMap[ans.user_id].score += 1;
        }

        scoresMap[ans.user_id].matches.push({
          question_id: ans.question_id,
          target_user_id: ans.target_user_id,
          target_name: participantMap.get(ans.target_user_id)?.name || 'Desconocido',
          guessed_answer: ans.answer_value,
          correct_answer: correctVal,
          is_correct: isCorrect
        });
      }
    }
  });

  // Convert to array and sort by score descending
  return Object.values(scoresMap).sort((a, b) => b.score - a.score);
};
