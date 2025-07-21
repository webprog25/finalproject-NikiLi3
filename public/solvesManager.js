import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc, getAggregateFromServer, count } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCraRPu7eXwbvJ4ac3sTQqAVKIng2deMkA",
  authDomain: "cubing-timer-e5755.firebaseapp.com",
  projectId: "cubing-timer-e5755",
  storageBucket: "cubing-timer-e5755.firebasestorage.app",
  messagingSenderId: "665696986894",
  appId: "1:665696986894:web:082720e6856746e0f8d95f",
  measurementId: "G-X8FZ7VRF3H"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export class SolvesManager {
  constructor(userCollectionPath = 'users', solvesSubcollection = 'solves', n = 1000) {
    this.userCollectionPath = userCollectionPath;
    this.solvesSubcollection = solvesSubcollection;
    this.n = n;
    this.userID = null;
    this.solvesCache = [];
    this.unsubscribe = null;

    this.authReady = new Promise((resolve, reject) => {
      signInAnonymously(auth)
        .then(() => {
          console.log('Signed in anonymously');
        })
        .catch((error) => {
          console.error('Anonymous auth error:', error);
          reject(error);
        });

      onAuthStateChanged(auth, (user) => {
        if (user) {
          this.userID = user.uid;
          localStorage.setItem('cubeUserID', user.uid);
          resolve();
        } else {
          console.log('No user signed in');
          reject(new Error('No user signed in'));
        }
      });
    });
  }

  async initRealTimeListener(selectedEvent = null, onCacheUpdate = null) {
    await this.authReady;

    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const solvesRef = collection(db, this.userCollectionPath, this.userID, this.solvesSubcollection);
    let q = query(solvesRef, orderBy('timestamp', 'desc'), limit(this.n));

    if (selectedEvent) {
      q = query(solvesRef, where('puzzleType', '==', selectedEvent), orderBy('timestamp', 'desc'), limit(this.n));
    }

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.solvesCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Cache updated:', {
        event: selectedEvent || 'all',
        solveCount: this.solvesCache.length,
        solves: this.solvesCache.map(s => ({ puzzleType: s.puzzleType, timeMs: s.timeMs }))
      });
      if (onCacheUpdate) {
        onCacheUpdate(this.solvesCache);
      }
    }, (error) => {
      console.error('Snapshot error:', error);
    });
  }

  async addSolve(solveData) {
    await this.authReady;
    const solvesRef = collection(db, this.userCollectionPath, this.userID, this.solvesSubcollection);
    const dataWithTimestamp = { ...solveData, timestamp: Date.now() };
    await addDoc(solvesRef, dataWithTimestamp);
  }

  async deleteSolve(solveId) {
    await this.authReady;
    const solveDoc = doc(db, this.userCollectionPath, this.userID, this.solvesSubcollection, solveId);
    await deleteDoc(solveDoc);
  }

  async getSolveCountForEvent(puzzleType) {
    await this.authReady;
    const solvesRef = collection(db, this.userCollectionPath, this.userID, this.solvesSubcollection);
    const q = query(solvesRef, where('puzzleType', '==', puzzleType));
    const aggregateSnapshot = await getAggregateFromServer(q, { count: count() });
    return aggregateSnapshot.data().count;
  }

  calculatePercentiles() {
    if (this.solvesCache.length === 0) return {};

    const sortedTimes = [...this.solvesCache].sort((a, b) => a.timeMs - b.timeMs).map(s => s.timeMs);
    const thresholds = {};
    for (let percentile = 10; percentile <= 100; percentile += 10) {
      const index = Math.ceil((percentile / 100) * sortedTimes.length) - 1;
      thresholds[percentile] = sortedTimes[Math.max(index, 0)];
    }
    return thresholds;
  }

  getColorForTime(timeMs) {
    const thresholds = this.calculatePercentiles();
    const colors = ['#00FF00', '#80FF00', '#FFFF00', '#FFD700', '#FFA500', '#FF8000', '#FF4000', '#FF2000', '#FF0000', '#800000'];
    let bucket = 0;
    for (const percentile in thresholds) {
      if (timeMs <= thresholds[percentile]) {
        return colors[bucket];
      }
      bucket++;
    }
    return colors[colors.length - 1];
  }

  getCachedSolves() {
    return [...this.solvesCache];
  }
}