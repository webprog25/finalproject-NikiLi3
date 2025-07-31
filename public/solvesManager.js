import { db } from './authentication.js';
import { collection,  query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc, setDoc, getCountFromServer } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

export class SolvesManager {
  constructor(userPath = 'users', solvesPath = 'solves', n = 1000) {
    this.userPath = userPath;
    this.solvesPath = solvesPath;
    this.n = n;
    this.userID = null;
    this.solvesCache = [];
    this.unsubscribe = null;
  }

  async initRealTimeListener(event = null, onUpdate = null) {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const baseQuery = query(
      collection(db, this.userPath, this.userID, this.solvesPath),
      orderBy('timestamp', 'desc'),
      limit(this.n)
    );

    const q = event ? query(baseQuery, where('puzzleType', '==', event)) : baseQuery;

    this.unsubscribe = onSnapshot(q, snap => {
      this.solvesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      onUpdate?.(this.solvesCache);
    });
  }

  async addSolve(solve) {
    await addDoc(
      collection(db, this.userPath, this.userID, this.solvesPath),
      { ...solve, timestamp: Date.now() }
    );
    // Let the real-time listener handle cache updates
  }

  async deleteLastSolve() {
    const solves = this.getCachedSolves();
    console.log('deleteLastSolve: solves count:', solves.length);
    if (solves.length === 0) {
      console.log('deleteLastSolve: no solves to delete');
      return false;
    }

    const lastSolve = solves[0];
    console.log('deleteLastSolve: lastSolve:', lastSolve);
    if (lastSolve.id && lastSolve.id !== 'local') {
      console.log('deleteLastSolve: attempting to delete solve with id:', lastSolve.id);
      try {
        await deleteDoc(doc(db, this.userPath, this.userID, this.solvesPath, lastSolve.id));
        console.log('deleteLastSolve: deletion successful');
        return true;
      } catch (error) {
        console.error('deleteLastSolve: deletion failed:', error);
        return false;
      }
    }
    console.log('deleteLastSolve: solve has no valid id or is local, cannot delete');
    return false;
  }

  async createUserDocument() {
    await setDoc(
      doc(db, this.userPath, this.userID),
      { createdAt: Date.now() },
      { merge: true }
    );
  }

  async getSolveCountsPerEvent(events) {
    const col = collection(db, this.userPath, this.userID, this.solvesPath);
    const out = {};

    await Promise.all(events.map(async ev => {
      const snap = await getCountFromServer(query(col, where('puzzleType', '==', ev)));
      out[ev] = snap.data().count;
    }));

    return out;
  }

  getCachedSolves() {
    return [...this.solvesCache];
  }

  setUserId(id) {
    this.userID = id;
  }
}
