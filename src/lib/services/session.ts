import { db } from '@/src/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  arrayUnion, 
  onSnapshot
} from 'firebase/firestore';
import { Session, Participant, SessionStatus } from '@/src/types';
import { getDefaultTest } from './test';

// Generate a random 6-character alphanumeric code
const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate a random ID for users since we aren't enforcing strict auth yet
export const generateUserId = () => {
  return Math.random().toString(36).substring(2, 15);
};

export const createSession = async (hostName: string): Promise<{ sessionId: string, hostId: string, shortCode: string }> => {
  const shortCode = generateShortCode();
  const hostId = generateUserId();
  const sessionId = doc(collection(db, 'sessions')).id;
  
  const hostParticipant: Participant = {
    id: hostId,
    name: hostName,
    isHost: true,
    joinedAt: Date.now()
  };

  const newSession: Session = {
    id: sessionId,
    shortCode,
    host_id: hostId,
    test_id: null,
    status: 'waiting',
    participants: [hostParticipant],
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'sessions', sessionId), newSession);

  return { sessionId, hostId, shortCode };
};

export const joinSessionByCode = async (shortCode: string, playerName: string): Promise<{ sessionId: string, playerId: string } | null> => {
  // Find session by shortCode
  const q = query(collection(db, 'sessions'), where('shortCode', '==', shortCode.toUpperCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null; // Session not found
  }
  
  const sessionDoc = querySnapshot.docs[0];
  const sessionId = sessionDoc.id;
  const playerId = generateUserId();
  
  const newParticipant: Participant = {
    id: playerId,
    name: playerName,
    isHost: false,
    joinedAt: Date.now()
  };

  // Add the participant to the array
  await updateDoc(doc(db, 'sessions', sessionId), {
    participants: arrayUnion(newParticipant)
  });

  return { sessionId, playerId };
};

export const subscribeToSession = (sessionId: string, callback: (session: Session | null) => void) => {
  return onSnapshot(doc(db, 'sessions', sessionId), (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback(docSnapshot.data() as Session);
    } else {
      callback(null);
    }
  });
};

export const updateSessionStatus = async (sessionId: string, status: SessionStatus) => {
  await updateDoc(doc(db, 'sessions', sessionId), {
    status
  });
};

export const startGame = async (sessionId: string) => {
  const test = await getDefaultTest();
  await updateDoc(doc(db, 'sessions', sessionId), {
    status: 'phase1',
    test_id: test.id
  });
};
