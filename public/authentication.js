import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, addDoc } from 'https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'cubing-timer-e5755.firebaseapp.com',
  projectId: 'cubing-timer-e5755',
  storageBucket: 'cubing-timer-e5755.appspot.com',
  messagingSenderId: '665696986894',
  appId: '1:665696986894:web:082720e6856746e0f8d95f'
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export class AuthManager {
  constructor(solvesManager) {
    this.key = 'cubeUserID';
    this.solvesManager = solvesManager;
    this.listenersReady = false;
  }

  async initAuth() {
    return new Promise(resolve => {
      const storedUserId = localStorage.getItem(this.key);

      if (storedUserId) {
        this.verifyUserId(storedUserId).then(ok => {
          if (ok) {
            this.solvesManager.setUserId(storedUserId);
            resolve(true);
          } else {
            this.clearStoredUserId();
            this.showAuthPopup();
            this.setupListeners(resolve);
          }
        });
      }
      else {
        this.showAuthPopup();
        this.setupListeners(resolve);
      }
    });
  }

  async verifyUserId(id) {
    try {
      const snap = await getDoc(doc(db, 'users', id));
      return snap.exists();
    }
    catch {
      return false;
    }
  }

  async createNewUser() {
    const ref = await addDoc(collection(db, 'users'), { createdAt: Date.now() });
    const id = ref.id;
    this.storeUserId(id);
    this.solvesManager.setUserId(id);
    this.hideAuthPopup();
  }

  // popup helpers
  showAuthPopup() {
    document.getElementById('authOverlay').classList.remove('hidden');
  }

  hideAuthPopup() {
    document.getElementById('authOverlay').classList.add('hidden');
  }

  showImportPopup() {
    document.getElementById('importOverlay').classList.remove('hidden');
  }

  hideImportPopup() {
    document.getElementById('importOverlay').classList.add('hidden');
  }

  showImportError(msg) {
    const el = document.getElementById('importError');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  hideImportError() {
    document.getElementById('importError').classList.add('hidden');
  }

  validateFormatOfUserId(id) {
    return /^[a-zA-Z0-9]{28}$/.test(id);
  }

  setupListeners(resolve) {
    if (this.listenersReady) return;
    this.listenersReady = true;

    const createBtn = document.getElementById('createUserBtn');
    const importBtn = document.getElementById('importUserBtn');
    const okBtn = document.getElementById('importConfirmBtn');
    const cancelBtn = document.getElementById('importCancelBtn');
    const input = document.getElementById('userIdInput');

    createBtn.onclick = async () => {
      await this.createNewUser();
      resolve(true);
    };

    importBtn.onclick = () => {
      this.hideAuthPopup();
      this.hideImportError();
      this.showImportPopup();
    };

    okBtn.onclick = async () => {
      const id = input.value.trim();

      if (!this.validateFormatOfUserId(id)) {
        this.showImportError('Invalid ID');
        return;
      }

      if (await this.verifyUserId(id)) {
        this.storeUserId(id);
        this.solvesManager.setUserId(id);
        this.hideImportPopup();
        resolve(true);
      }
      else {
        this.showImportError('User ID not found');
      }
    };

    cancelBtn.onclick = () => {
      this.hideImportPopup();
      this.showAuthPopup();
    };

    input.onkeydown = e => {
      if (e.key === 'Enter') okBtn.click();
    };
  }

  // localStorage helpers
  storeUserId(id) {
    localStorage.setItem(this.key, id);
  }
  clearStoredUserId() {
    localStorage.removeItem(this.key);
  }
}
