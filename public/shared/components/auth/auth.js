import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBTAWFbw_Yj0qOgc13-nJUL5__lcsFuz9I",
  authDomain: "auth.rankra.in",
  projectId: "rankra-in",
  storageBucket: "rankra-in.firebasestorage.app",
  messagingSenderId: "608634329807",
  appId: "1:608634329807:web:8921fbb319e455377575ba",
  measurementId: "G-KR52VLMDDL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let currentProfile = null;
let authCallback = null;

const CACHE_KEY_PREFIX = 'rankra_profile_';

// Inject CSS
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '/shared/components/auth/auth.css';
document.head.appendChild(link);

const onboardingFieldsHTML = `
  <div class="auth-label">I am a:</div>
  <div class="auth-chips" data-field="role">
    <button type="button" class="auth-chip selected" data-value="Student">Student</button>
    <button type="button" class="auth-chip" data-value="Teacher">Teacher</button>
  </div>

  <div class="auth-label">Medium</div>
  <div class="auth-chips" data-field="medium">
    <button type="button" class="auth-chip" data-value="Tamil">Tamil</button>
    <button type="button" class="auth-chip" data-value="English">English</button>
  </div>

  <div class="auth-label">School Type</div>
  <div class="auth-chips" data-field="schoolType">
    <button type="button" class="auth-chip" data-value="Govt">Govt</button>
    <button type="button" class="auth-chip" data-value="Aided">Aided</button>
    <button type="button" class="auth-chip" data-value="Private">Private</button>
  </div>

  <div id="auth-section-community">
    <div class="auth-label">Community</div>
    <div class="auth-chips" data-field="community">
      <button type="button" class="auth-chip" data-value="OC">OC</button>
      <button type="button" class="auth-chip" data-value="BC">BC</button>
      <button type="button" class="auth-chip" data-value="BCM">BCM</button>
      <button type="button" class="auth-chip" data-value="MBC">MBC</button>
      <button type="button" class="auth-chip" data-value="SC">SC</button>
      <button type="button" class="auth-chip" data-value="SCA">SCA</button>
      <button type="button" class="auth-chip" data-value="ST">ST</button>
    </div>
  </div>

  <div class="auth-label">Gender</div>
  <div class="auth-chips" data-field="gender">
    <button type="button" class="auth-chip" data-value="Male">Male</button>
    <button type="button" class="auth-chip" data-value="Female">Female</button>
    <button type="button" class="auth-chip" data-value="Other">Other</button>
  </div>
`;

const modalHTML = `
  <div id="auth-modal" class="overlay-full auth-overlay hidden" role="dialog" aria-modal="true">
    <div class="auth-sheet" style="max-height: 90vh; overflow-y: auto;">
      <button class="auth-back-top hidden" id="auth-back-top" aria-label="Back">←</button>
      <button class="auth-close" id="auth-close" aria-label="Close">✕</button>
      
      <div class="auth-header">
        <h2 class="auth-title" id="auth-title">Login to continue</h2>
        <p class="auth-subtitle" id="auth-subtitle"></p>
      </div>

      <div id="auth-message" class="auth-message"></div>
      <div id="auth-error" class="auth-error"></div>

      <div id="auth-google-section">
        <button class="auth-google-btn" id="auth-google-btn" type="button">
          <svg class="auth-google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <div class="auth-divider">OR</div>
      </div>

      <form id="auth-form" class="auth-form" novalidate>
        <!-- VIEW 1: EMAIL ENTRY -->
        <div id="view-email" class="auth-view">
          <div class="auth-input-group">
            <input type="email" id="auth-email" class="auth-input" placeholder="Enter email" autocomplete="email" />
          </div>
          <button type="submit" class="auth-submit-btn">Continue</button>
          
          <div class="auth-footer" style="margin-top: 16px; text-align: center; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Don't have an account?</span>
            <button type="button" class="auth-link" id="btn-go-to-signup-from-email">Sign up</button>
          </div>
        </div>

        <!-- VIEW 2: PASSWORD ENTRY -->
        <div id="view-password" class="auth-view hidden">
          <div class="auth-input-group">
            <input type="email" id="auth-password-email" class="auth-input" placeholder="Email" autocomplete="email" />
          </div>
          <div class="auth-input-group auth-password-wrap">
            <input type="password" id="auth-password" class="auth-input" placeholder="Enter your password" maxlength="6" autocomplete="current-password" />
            <button type="button" class="auth-eye-btn" id="auth-eye-login" aria-label="Toggle password visibility"><i class="fa-regular fa-eye"></i></button>
          </div>
          <div class="auth-forgot-row"><button type="button" class="auth-link" id="btn-forgot-password">Forgot password?</button></div>
          <button type="submit" class="auth-submit-btn">Login</button>
          <div class="auth-footer" style="margin-top: 16px; text-align: center; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Don't have an account?</span>
            <button type="button" class="auth-link" id="btn-go-to-signup">Sign up</button>
          </div>
        </div>

        <!-- VIEW 3: SIGNUP -->
        <div id="view-signup" class="auth-view hidden">
          <div class="auth-input-group"><input type="text" id="auth-name" class="auth-input" placeholder="Name" autocomplete="name" /></div>
          <div class="auth-input-group"><input type="email" id="auth-signup-email" class="auth-input" placeholder="Email" autocomplete="email" /></div>
          <div class="auth-input-group auth-password-wrap">
            <input type="password" id="auth-signup-password" class="auth-input" placeholder="Password (6 characters)" maxlength="6" autocomplete="new-password" />
            <button type="button" class="auth-eye-btn" id="auth-eye-signup" aria-label="Toggle password visibility"><i class="fa-regular fa-eye"></i></button>
          </div>
          ${onboardingFieldsHTML}
          <button type="submit" class="auth-submit-btn" style="margin-top: 12px;">Create account</button>
          <div class="auth-footer" style="margin-top: 16px; text-align: center; font-size: 0.85rem;">
            <span style="color: var(--text-secondary);">Already have an account?</span>
            <button type="button" class="auth-link" id="btn-go-to-login">Login</button>
          </div>
        </div>

        <!-- VIEW 4: ONBOARDING (for Google users) -->
        <div id="view-onboarding" class="auth-view hidden">
          ${onboardingFieldsHTML}
          <button type="submit" class="auth-submit-btn" style="margin-top: 12px;">Continue</button>
        </div>
      </form>
    </div>
  </div>
`;

document.body.insertAdjacentHTML('beforeend', modalHTML);

// Cache DOM
const modal = document.getElementById('auth-modal');
const form = document.getElementById('auth-form');
const titleEl = document.getElementById('auth-title');
const subtitleEl = document.getElementById('auth-subtitle');
const googleSec = document.getElementById('auth-google-section');
const googleBtn = document.getElementById('auth-google-btn');
const closeBtn = document.getElementById('auth-close');
const backTopBtn = document.getElementById('auth-back-top');
const errorDiv = document.getElementById('auth-error');
const messageDiv = document.getElementById('auth-message');

const views = {
  email: document.getElementById('view-email'),
  password: document.getElementById('view-password'),
  signup: document.getElementById('view-signup'),
  onboarding: document.getElementById('view-onboarding')
};

const inputEmail = document.getElementById('auth-email');
const inputPwEmail = document.getElementById('auth-password-email');
const inputPassword = document.getElementById('auth-password');

let currentView = 'email';

// Chip selection logic
function initChips() {
  document.querySelectorAll('.auth-chips').forEach(container => {
    container.addEventListener('click', (e) => {
      const chip = e.target.closest('.auth-chip');
      if (!chip || chip.classList.contains('disabled')) return;

      container.querySelectorAll('.auth-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');

      // Handle Teacher toggle: Gray only community
      if (container.dataset.field === 'role') {
        const commSection = document.querySelectorAll('#auth-section-community');
        if (chip.dataset.value === 'Teacher') {
          commSection.forEach(f => f.classList.add('auth-section-disabled'));
        } else {
          commSection.forEach(f => f.classList.remove('auth-section-disabled'));
        }
      }
    });
  });
}
initChips();

function getChipValue(field) {
  const selected = document.querySelector(`.auth-view:not(.hidden) .auth-chips[data-field="${field}"] .auth-chip.selected`);
  return selected ? selected.dataset.value : null;
}

function setView(view) {
  currentView = view;
  errorDiv.style.display = 'none';
  messageDiv.style.display = 'none';

  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[view].classList.remove('hidden');

  if (view === 'email') {
    titleEl.textContent = 'Login to continue';
    subtitleEl.textContent = 'Access your personalized Rankra experience';
    googleSec.classList.remove('hidden');
    backTopBtn.classList.add('hidden');
  }
  else if (view === 'password') {
    titleEl.textContent = 'Login with email';
    subtitleEl.textContent = '';
    googleSec.classList.add('hidden');
    backTopBtn.classList.remove('hidden');
    inputPwEmail.value = inputEmail.value;
    inputPassword.value = '';
    inputPassword.focus();
  }
  else if (view === 'signup') {
    titleEl.textContent = 'Create an account';
    subtitleEl.textContent = 'Join Rankra today';
    googleSec.classList.remove('hidden');
    backTopBtn.classList.remove('hidden');
    document.getElementById('auth-signup-email').value = inputEmail.value;
  }
  else if (view === 'onboarding') {
    titleEl.textContent = 'Welcome to Rankra!';
    subtitleEl.textContent = 'Please fill these things then use rankra enhance and give titles etc..';
    googleSec.classList.add('hidden');
    backTopBtn.classList.add('hidden');
  }
}

// Eye toggles
function setupEyeToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  btn.addEventListener('click', () => {
    const isHidden = inp.type === 'password';
    inp.type = isHidden ? 'text' : 'password';
    btn.innerHTML = isHidden ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
  });
}
setupEyeToggle('auth-eye-login', 'auth-password');
setupEyeToggle('auth-eye-signup', 'auth-signup-password');

backTopBtn.addEventListener('click', () => setView('email'));
document.getElementById('btn-go-to-signup').addEventListener('click', () => setView('signup'));
document.getElementById('btn-go-to-signup-from-email').addEventListener('click', () => setView('signup'));
document.getElementById('btn-forgot-password').addEventListener('click', async () => {
  const email = inputPwEmail.value.trim();
  if (!email) {
    showError('Enter your email first.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showMessage('Password reset email sent! Check your inbox.');
  } catch (err) {
    showError(err.message);
  }
});

document.getElementById('btn-go-to-login').addEventListener('click', () => setView('password'));

closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

function showError(msg) {
  msg = msg.replace(/Firebase:\s*/i, '').replace(/\(auth\/.*?\)\.?/i, '').trim();
  errorDiv.textContent = msg || 'Something went wrong.';
  errorDiv.style.display = 'block';
  messageDiv.style.display = 'none';
}

function showMessage(msg) {
  messageDiv.textContent = msg;
  messageDiv.style.display = 'block';
  errorDiv.style.display = 'none';
}

async function saveUserProfile(user, data) {
  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || data.name || '',
    gender: data.gender || '',
    role: data.role || 'Student',
    community: data.role === 'Teacher' ? null : data.community,
    schoolType: data.role === 'Teacher' ? null : data.schoolType,
    medium: data.role === 'Teacher' ? null : data.medium,
    onboardingComplete: true,
    updatedAt: new Date()
  };
  await setDoc(doc(db, 'users', user.uid), profile);
  localStorage.setItem(CACHE_KEY_PREFIX + user.uid, JSON.stringify(profile));
  currentProfile = profile;
  return profile;
}

async function getCachedProfile(uid) {
  const cached = localStorage.getItem(CACHE_KEY_PREFIX + uid);
  if (cached) return JSON.parse(cached);
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) {
    const data = snap.data();
    localStorage.setItem(CACHE_KEY_PREFIX + uid, JSON.stringify(data));
    return data;
  }
  return null;
}

function showToast(msg) {
  const old = document.querySelector('.auth-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'auth-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = form.querySelector('.auth-view:not(.hidden) .auth-submit-btn');
  if (!submitBtn) return;
  const originalText = submitBtn.textContent;

  try {
    if (currentView === 'email') {
      setView('password');
    }
    else if (currentView === 'password') {
      const email = inputPwEmail.value.trim();
      const password = inputPassword.value;
      if (password.length < 6) throw new Error('Password must be 6 characters.');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Wait...';
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        if (!cred.user.emailVerified) throw new Error('Please verify your email.');
        const profile = await getCachedProfile(cred.user.uid);
        if (!profile) setView('onboarding');
        else {
          modal.classList.add('hidden');
          if (authCallback) authCallback(cred.user, profile);
        }
      } catch (err) {
        if (err.code === 'auth/user-not-found') setView('signup');
        else throw err;
      }
    }
    else if (currentView === 'signup' || currentView === 'onboarding') {
      const missing = [];
      const role = getChipValue('role');
      const gender = getChipValue('gender');

      if (!role) missing.push('role');

      const medium = getChipValue('medium');
      const schoolType = getChipValue('schoolType');
      if (!medium) missing.push('medium');
      if (!schoolType) missing.push('school type');

      let community = null;
      if (role === 'Student') {
        community = getChipValue('community');
        if (!community) missing.push('community');
      }

      if (!gender) missing.push('gender');

      if (missing.length > 0) {
        showToast('Select ' + missing.join(', '));
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Wait...';

      let user = currentUser;
      if (currentView === 'signup') {
        const email = document.getElementById('auth-signup-email').value.trim();
        const password = document.getElementById('auth-signup-password').value;
        const name = document.getElementById('auth-name').value.trim();
        if (!name) throw new Error('Enter your name.');
        if (password.length < 6) throw new Error('Password must be 6 characters.');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        await saveUserProfile(user, { name, gender, role, community, schoolType, medium });
        await sendEmailVerification(user);
        setView('email');
        showMessage('Check your email for the verification link!');
      } else {
        await saveUserProfile(user, { gender, role, community, schoolType, medium });
        modal.classList.add('hidden');
        if (authCallback) authCallback(user, currentProfile);
      }
    }
  } catch (error) {
    showError(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

googleBtn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = await getCachedProfile(result.user.uid);
    if (!profile) {
      currentUser = result.user;
      setView('onboarding');
    } else {
      modal.classList.add('hidden');
      if (authCallback) authCallback(result.user, profile);
    }
  } catch (error) {
    showError(error.message);
  }
});

let authReady = false;
const authListeners = [];
const authReadyPromise = new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!authReady) {
      authReady = true;
      currentUser = user;
      
      // Resolve the promise immediately so requireAuth callers aren't blocked by profile fetch
      resolve(user);

      if (user) {
        try {
          currentProfile = await getCachedProfile(user.uid);
        } catch (e) {
          console.error("Profile fetch failed:", e);
        }
      }
      
      unsubscribe();
      authListeners.forEach(cb => cb(currentUser, currentProfile));
    }
  });
});

window.RankraAuth = {
  onAuthChange(callback) {
    authListeners.push(callback);
    if (authReady) callback(currentUser, currentProfile);
  },
  async requireAuth(callback) {
    authCallback = callback;
    await authReadyPromise;
    
    // If we have a user but no profile yet, wait a bit for the async fetch to finish
    if (currentUser && !currentProfile) {
      let attempts = 0;
      while (!currentProfile && attempts < 20) { // Max 2 seconds
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }
    }

    if (currentUser) {
      if (currentUser.emailVerified || currentUser.providerData[0]?.providerId === 'google.com') {
        document.body.classList.remove('is-guest');
        if (!currentProfile) {
          modal.classList.remove('hidden');
          setView('onboarding');
        } else {
          callback(currentUser, currentProfile);
        }
      } else {
        modal.classList.remove('hidden');
        showError('Verify your email first!');
      }
    } else {
      // DEFAULT: Grant guest access instead of showing modal
      const guestProfile = { isGuest: true, community: 'OC', role: 'Student', displayName: 'Guest User' };
      currentProfile = guestProfile;
      document.body.classList.add('is-guest');
      callback(null, guestProfile);
      authListeners.forEach(cb => cb(null, guestProfile));
    }
  },
  showLogin() {
    modal.classList.remove('hidden');
    setView('email');
  },
  async updateProfile(data) {
    if (!currentUser) throw new Error('Not authenticated');
    const updated = { ...currentProfile, ...data, updatedAt: new Date() };
    await setDoc(doc(db, 'users', currentUser.uid), updated);
    localStorage.setItem(CACHE_KEY_PREFIX + currentUser.uid, JSON.stringify(updated));
    currentProfile = updated;
    authListeners.forEach(cb => cb(currentUser, currentProfile));
    return updated;
  },
  async logout() {
    if (currentUser) localStorage.removeItem(CACHE_KEY_PREFIX + currentUser.uid);
    await signOut(auth);
    window.location.reload();
  },
  getCurrentUser: () => currentUser,
  getProfile: () => currentProfile,
  isGuest: () => !currentUser && currentProfile?.isGuest
};
