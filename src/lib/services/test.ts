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
import { Test, Answer } from '@/src/types';

const DEFAULT_TEST_ID = 'default_test_01';

const defaultTestContent: Test = {
  id: DEFAULT_TEST_ID,
  title: 'Conociéndonos Mejor',
  questions: [
    {
      id: 'q1',
      type: 'multiple_choice',
      text: '¿Cuál es tu plan ideal para un fin de semana?',
      options: [
        'Quedarme en casa viendo películas/series',
        'Salir de fiesta con amigos',
        'Ir a la naturaleza (playa, montaña, acampar)',
        'Ir a un buen restaurante o evento cultural'
      ]
    },
    {
      id: 'q2',
      type: 'multiple_choice',
      text: 'Si pudieras tener un superpoder, ¿cuál elegirías?',
      options: [
        'Volar',
        'Leer la mente',
        'Invisibilidad',
        'Teletransportación'
      ]
    },
    {
      id: 'q3',
      type: 'free_response',
      text: '¿Cuál es tu mayor fobia o miedo irracional?'
    }
  ]
};

/**
 * Gets the default test from Firestore. If it doesn't exist, it creates it.
 */
export const getDefaultTest = async (): Promise<Test> => {
  const testRef = doc(db, 'tests', DEFAULT_TEST_ID);
  const testSnap = await getDoc(testRef);

  if (!testSnap.exists()) {
    // Create the default test
    await setDoc(testRef, defaultTestContent);
    return defaultTestContent;
  }

  return testSnap.data() as Test;
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
