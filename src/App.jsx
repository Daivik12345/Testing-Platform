import { hasCompleteAnswerKey, matchesQuestionFilter } from './practice.js';
import { readSession, saveSession, clearSession } from './session.js';
import { scoreAttempt } from './scoring.js';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import {
  LogOut,
  Play,
  PlusCircle,
  Activity,
  BookOpen,
  Clock,
  Trash2,
  ChevronRight,
  LayoutDashboard,
  Target
} from 'lucide-react';

const AdminAnalytics = lazy(() => import('./Analytics.jsx').then(m => ({default:m.AdminAnalytics})));
const StudentAnalytics = lazy(() => import('./Analytics.jsx').then(m => ({default:m.StudentAnalytics})));

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let auth, db, startupError;
try {
  const missing = ['apiKey', 'authDomain', 'projectId', 'appId'].filter(key => !firebaseConfig[key]);
  if (missing.length) throw new Error(`Missing Firebase settings: ${missing.join(', ')}. Update Vercel environment variables and redeploy.`);
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) { startupError = error.message; }
const appId = 'neet-cbt-portal';
function withTimeout(promise, ms) {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Saving timed out. Retry when connected; the same attempt ID prevents duplicate records.')), ms);
  })]).finally(() => clearTimeout(timer));
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [error, setError] = useState(startupError || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try { return readSession(window.localStorage); } catch { return null; }
  });
  const [view, setView] = useState(() => currentUser ? (currentUser.role === 'admin' ? 'admin-dash' : 'student-dash') : 'login');

  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeTest, setActiveTest] = useState(null);

  // Initialize Firebase Auth
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        setError(`Sign-in failed (${err.code || err.message}). Check Anonymous sign-in and account creation in Firebase Authentication.`);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setFirebaseUser);
    return () => unsubscribe();
  }, []);

  // Fetch Data from Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    const testsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tests');
    const attemptsRef = collection(db, 'artifacts', appId, 'public', 'data', 'attempts');

    const unsubTests = onSnapshot(testsRef, (snapshot) => {
      const testsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTests(testsData.sort((a, b) => b.createdAt - a.createdAt));
    }, (err) => setError(`Cannot load tests: ${err.message}. Check Firestore setup and access rules.`));

    const unsubAttempts = onSnapshot(attemptsRef, (snapshot) => {
      const attemptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttempts(attemptsData.sort((a, b) => b.submittedAt - a.submittedAt));
    }, (err) => setError(`Cannot load attempts: ${err.message}. Check Firestore setup and access rules.`));

    return () => {
      unsubTests();
      unsubAttempts();
    };
  }, [firebaseUser]);

  const handleLogin = (role, name) => {
    const user = { role, name };
    try { if (!saveSession(window.localStorage, user)) setError('Browser storage is unavailable. You can use the app, but sign-in will not survive a refresh.'); } catch { setError('Enable browser storage to keep your session after refresh.'); }
    setCurrentUser(user);
    setView(role === 'admin' ? 'admin-dash' : 'student-dash');
  };

  const handleLogout = () => {
    try { clearSession(window.localStorage); } catch { /* Storage unavailable. */ }
    setCurrentUser(null);
    setView('login');
    setActiveTest(null);
  };

  const startTest = (test) => {
    if (!confirm(`${test.name} — ${test.duration} minutes, ${test.totalQuestions} questions. Scoring: +4 correct, −1 incorrect, 0 skipped. Answers save on this device. The timer continues if you leave or reload. Existing drafts resume automatically. Ready to begin?`)) return;
    setActiveTest(test);
    setView('test-env');
  };

  const finishTest = async (testId, resultData) => {
    if (!firebaseUser) throw new Error("You are not connected. Reload and sign in again.");
    try {
      const attemptsRef = collection(db, 'artifacts', appId, 'public', 'data', 'attempts');
      if (!navigator.onLine) throw new Error('You are offline');
      await withTimeout(setDoc(doc(attemptsRef, resultData.attemptId), {
        testId,
        testName: activeTest.name,
        studentName: currentUser.name,
        userId: firebaseUser.uid,
        submittedAt: Date.now(),
        ...resultData
      }), 15000);
      setView('student-dash');
      setActiveTest(null);
    } catch (err) {
      throw new Error(`Unable to save attempt: ${err.message}. Your answers remain on this device; retry when connected.`);
    }
  };

  if (!firebaseUser && error) return <div className="startup"><div className="surface"><Activity size={32}/><h1>Let’s get you connected.</h1><p role="alert">{error}</p><button onClick={() => location.reload()}>Try again</button></div></div>;
  if (!firebaseUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Activity size={48} className="text-indigo-400" />
          <h2 className="text-xl font-medium tracking-widest">Connecting to your workspace…</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-theme min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/30 selection:text-indigo-900">
      {error && <div role="alert" className="error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
      {view === 'login' && <LoginScreen onLogin={handleLogin} />}
      {view === 'admin-dash' && <AdminDashboard tests={tests} attempts={attempts} onLogout={handleLogout} />}
      {view === 'student-dash' && <StudentDashboard tests={tests} attempts={attempts.filter(a => a.studentName === currentUser?.name)} currentUser={currentUser} onLogout={handleLogout} onStartTest={startTest} />}
      {view === 'test-env' && <TestEnvironment test={activeTest} onFinish={finishTest} onCancel={() => setView('student-dash')} currentUser={currentUser} />}
    </div>
  );
}

// --- LOGIN SCREEN ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim().toLowerCase() === 'daivik' && password === 'Daivik@2005') {
      onLogin('admin', 'Daivik');
    } else if (username.trim().toLowerCase() === 'soumya sharma' && password === 'neet2027') {
      onLogin('student', 'Soumya Sharma');
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  return (
    <div className="login-page">
      <header className="login-nav"><a className="focus-wordmark" href="/" aria-label="Focus home"><span className="focus-symbol">f.</span>focus<span className="wordmark-divider"/>NEET Practice</a></header>
      <main className="login-layout">
        <section className="login-story">
          <p className="login-kicker"><span/> NEET 2027</p>
          <h1>A clear mind.<br/>A stronger <span>tomorrow.</span></h1>
          <p className="login-description">Practice. Review. Improve.</p>
          <div className="practice-preview" aria-label="Practice workflow illustration">
            <div className="preview-heading"><span className="preview-icon"><BookOpen size={20}/></span><div><strong>Your next step</strong></div><span className="preview-pill">NEET 2027</span></div>
            <div className="preview-steps"><div><span>01</span><strong>Practice</strong><p>Find your rhythm</p></div><div><span>02</span><strong>Review</strong><p>Understand each answer</p></div><div><span>03</span><strong>Improve</strong><p>Build on your progress</p></div></div>
          </div>
          <div className="login-features"><span><Clock size={16}/> Timed sessions</span><span><BookOpen size={16}/> Saved attempts</span><span><Activity size={16}/> Clear insights</span></div>
        </section>
        <section className="login-card" aria-labelledby="login-heading">
          <div className="login-card-icon"><Target size={25}/></div>
          <h2 id="login-heading">Welcome back.</h2>
          <form onSubmit={handleSubmit} className="login-form">
            <label htmlFor="username">Username</label><input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your username" required/>
            <label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
            {error && <p role="alert" className="login-error">{error}</p>}
            <button type="submit" className="login-submit">Continue <ChevronRight size={18}/></button>
            <p className="session-note">Signed in for 7 days. Log out on shared devices.</p>
          </form>

        </section>
      </main>
      <footer className="login-footer"><span>Focus</span><span>NEET Practice</span></footer>
    </div>
  );
}

// --- ADMIN DASHBOARD ---
function AdminDashboard({ tests, attempts, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="flex h-screen flex-col bg-slate-50/50">
      <header className="flex items-center justify-between bg-white/80 backdrop-blur-xl px-8 py-5 shadow-sm border-b border-slate-200/60 sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl"><LayoutDashboard className="text-indigo-600 w-6 h-6" /></div>
          Focus / Workspace
        </h1>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">Daivik</span>
            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">System Admin</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 bg-white/60 backdrop-blur-md border-r border-slate-200/60 p-6 flex flex-col gap-2">
          <nav className="space-y-2">
            {[
              { id: 'analytics', icon: Activity, label: 'Overview' },
              { id: 'create-test', icon: PlusCircle, label: 'Create test' },
              { id: 'manage-tests', icon: BookOpen, label: 'Test library' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left font-bold transition-all duration-300 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200'
                    : 'text-slate-600 hover:bg-white hover:shadow-md border border-transparent hover:border-slate-200'
                }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-400'} />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'analytics' && <><Suspense fallback={<p>Loading analytics…</p>}><AdminAnalytics attempts={attempts} /></Suspense><AttemptHistory attempts={attempts} /></>}
            {activeTab === 'create-test' && <CreateTestForm onSuccess={() => setActiveTab('manage-tests')} />}
            {activeTab === 'manage-tests' && <ManageTests tests={tests} attempts={attempts} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function CreateTestForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(200);
  const [pdfUrl, setPdfUrl] = useState('');
  const [totalQs, setTotalQs] = useState(200);
  const [answerKey, setAnswerKey] = useState(() => Object.fromEntries(Array.from({length:200},(_,i)=>[i+1,''])));
  const [loading, setLoading] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const generateEmptyKey = (count) => {
    const key = {};
    for (let i = 1; i <= count; i++) key[i] = '';
    return key;
  };

  const handleKeyChange = (qNum, val) => {
    setAnswerKey(prev => ({ ...prev, [qNum]: val }));
  };

  const handleBulkUpload = (e) => {
    try {
      const json = JSON.parse(e.target.value);
      if (json && !Array.isArray(json) && Object.entries(json).every(([k,v]) => Number.isInteger(Number(k)) && Number(k) >= 1 && Number(k) <= totalQs && ['A','B','C','D'].includes(v))) {
        setAnswerKey(prev => ({...prev, ...json}));
        setImportMessage(`Imported ${Object.keys(json).length} answers.`);
      } else setImportMessage('Use question numbers within this test and answers A, B, C or D.');
    } catch { setImportMessage('Enter valid JSON, for example {"1":"A","2":"C"}.'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !Number.isInteger(Number(totalQs)) || totalQs < 1 || totalQs > 300 || duration < 1 || duration > 360) { alert('Use a title, 1–300 questions, and a duration of 1–360 minutes.'); return; }
    if (pdfUrl && !/^https:\/\//i.test(pdfUrl)) { alert('Use an HTTPS link for the question paper.'); return; }
    if (!hasCompleteAnswerKey(totalQs, answerKey)) { alert('Complete the answer key before publishing.'); return; }
    setLoading(true);
    try {
      const testsRef = collection(db, 'artifacts', appId, 'public', 'data', 'tests');
      await addDoc(testsRef, {
        name,
        duration: Number(duration),
        totalQuestions: Number(totalQs),
        pdfUrl,
        answerKey,
        createdAt: Date.now()
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert(`Failed to create test: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><PlusCircle size={28}/></div>
        <h2 className="text-2xl font-extrabold text-slate-800">Create a test</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">Test Title</label>
            <input type="text" required value={name} onChange={e=>setName(e.target.value)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="e.g. NEET Full Syllabus Mock 1" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">Duration (Minutes)</label>
            <input type="number" required value={duration} onChange={e=>setDuration(e.target.value)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">Question Paper PDF URL</label>
            <input type="url" value={pdfUrl} onChange={e=>setPdfUrl(e.target.value)} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" placeholder="https://example.com/paper.pdf" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-slate-700 ml-1">Total Questions</label>
            <input type="number" min="1" max="300" required value={totalQs} onChange={e=>{const count=Math.min(300,Math.max(1,Number(e.target.value)||1));setTotalQs(count);setAnswerKey(prev=>Object.fromEntries(Object.keys(generateEmptyKey(count)).map(k=>[k,prev[k] || ''])));}} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="mb-6">
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Answer key</h3>
            <p className="text-sm font-medium text-slate-500">Configure manually or paste a JSON object format (e.g. <code>&#123;"1":"A", "2":"C"&#125;</code>)</p>
          </div>
          <textarea
            placeholder='Paste JSON here for bulk import...'
            className="w-full p-5 border border-slate-200 rounded-2xl mb-6 font-mono text-sm bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            rows={3}
            onChange={handleBulkUpload}
          />
          <p className="inline-note" role="status">{importMessage || `${Object.values(answerKey).filter(Boolean).length} of ${totalQs} answers set`}</p>
          <div className="h-80 overflow-y-auto p-6 border border-slate-200 rounded-3xl bg-slate-50/50 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 custom-scrollbar">
            {Array.from({length: totalQs}).map((_, i) => {
              const qNum = i + 1;
              return (
                <div key={qNum} className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                  <span className="text-xs font-black text-slate-400 mb-2 tracking-widest">Q{qNum}</span>
                  <select
                    aria-label={`Correct answer for question ${qNum}`} value={answerKey[qNum] || ''}
                    onChange={e => handleKeyChange(qNum, e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm w-full font-bold text-center text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-slate-50 cursor-pointer"
                  >
                    <option value="">—</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="D">D</option>
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        <button disabled={loading} type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 text-white font-extrabold text-lg py-5 rounded-2xl shadow-[0_10px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_15px_30px_rgba(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:hover:translate-y-0">
          {loading ? 'Publishing Test...' : 'Publish test'}
        </button>
      </form>
    </div>
  );
}

function ManageTests({ tests, attempts }) {
  const handleDelete = async (testId) => {
    if (!confirm('Delete this test? Past attempts will be preserved.')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tests', testId));
    } catch(err) {
      alert(`Unable to delete test: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">Test library</h2>
      <div className="grid gap-6">
        {tests.map(t => {
          const testAttempts = attempts.filter(a => a.testId === t.id);
          return (
            <div key={t.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between group hover:border-indigo-100 transition-colors">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <BookOpen size={28} />
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-800 mb-1">{t.name}</h3>
                  <div className="flex gap-4 text-sm font-semibold text-slate-500">
                    <span className="flex items-center gap-1"><Target size={16}/> {t.totalQuestions} Qs</span>
                    <span className="flex items-center gap-1"><Clock size={16}/> {t.duration} Mins</span>
                    <span className="flex items-center gap-1"><Activity size={16}/> {testAttempts.length} Submissions</span>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDelete(t.id)} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors border border-transparent hover:border-rose-100">
                <Trash2 size={24} />
              </button>
            </div>
          )
        })}
        {tests.length === 0 && (
          <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <BookOpen size={48} className="text-slate-300 mb-4" />
            <p className="text-lg font-bold text-slate-500">No tests published yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- STUDENT DASHBOARD ---
function StudentDashboard({ tests, attempts, currentUser, onLogout, onStartTest }) {
  const [activeTab, setActiveTab] = useState('tests');

  return (
    <div className="flex h-screen flex-col bg-slate-50/50">
      <header className="flex items-center justify-between bg-white/80 backdrop-blur-xl px-8 py-5 shadow-sm border-b border-slate-200/60 sticky top-0 z-20">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl shadow-inner"><Activity className="text-indigo-600 w-6 h-6" /></div>
          NEET Portal
          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider ml-2 shadow-sm">Student</span>
        </h1>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-sm font-extrabold text-slate-800">{currentUser.name}</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aspirant 2027</span>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm hover:shadow">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <div className="flex justify-center border-b border-slate-200/60 bg-white/50 backdrop-blur-md sticky top-[81px] z-10 pt-4">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-6 py-4 font-extrabold text-sm border-b-[3px] transition-all ${activeTab === 'tests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            Practice
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-4 font-extrabold text-sm border-b-[3px] transition-all ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            Progress
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-10">
        {activeTab === 'tests' && <StudentTestList tests={tests} onStartTest={onStartTest} />}
        {activeTab === 'results' && <><Suspense fallback={<p>Loading analytics…</p>}><StudentAnalytics attempts={attempts} /></Suspense><AttemptHistory attempts={attempts} /></>}
      </main>
    </div>
  );
}

function StudentTestList({ tests, onStartTest }) {
  const [search,setSearch]=useState('');
  const [sort,setSort]=useState('newest');
  const visible=tests.filter(t=>t.name.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='shortest'?a.duration-b.duration:sort==='name'?a.name.localeCompare(b.name):b.createdAt-a.createdAt);
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-8 tracking-tight">Your practice</h2>
      <div className="filter-bar"><input aria-label="Search tests" placeholder="Search tests…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Sort tests" value={sort} onChange={e=>setSort(e.target.value)}><option value="newest">Newest first</option><option value="shortest">Shortest first</option><option value="name">Name</option></select></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {visible.map(t => (
          <div key={t.id} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 flex flex-col hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 group">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 bg-indigo-50 w-fit px-3 py-1.5 rounded-full">
                <BookOpen size={14} /> Full Syllabus
              </div>
              <h3 className="text-2xl font-extrabold text-slate-800 mb-6 leading-tight group-hover:text-indigo-600 transition-colors">{t.name}</h3>
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-2"><Clock size={18} className="text-slate-400"/> Duration</span>
                  <span className="text-slate-800">{t.duration} Mins</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-2"><Target size={18} className="text-slate-400"/> Questions</span>
                  <span className="text-slate-800">{t.totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="flex items-center gap-2"><Activity size={18} className="text-slate-400"/> Max Marks</span>
                  <span className="text-slate-800">{t.totalQuestions * 4}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onStartTest(t)}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white font-extrabold text-lg py-4 rounded-2xl hover:bg-indigo-600 hover:shadow-[0_10px_25px_rgba(79,70,229,0.3)] transition-all duration-300 group-hover:scale-[1.02]"
            >
              <Play size={20} fill="currentColor" /> Start practice
            </button>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="col-span-full p-20 flex flex-col items-center text-slate-400 bg-white/50 rounded-3xl border border-dashed border-slate-300">
            <Target size={48} className="mb-4 text-slate-300" />
            <p className="text-lg font-bold text-slate-500">No active assessments found.</p>
            <p className="text-sm mt-2">Take a break! New mock tests will appear here when published.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- NTA TEST ENVIRONMENT ---
function TestEnvironment({ test, onFinish, onCancel, currentUser }) {
  const draftKey = `neet-draft:${currentUser.name}:${test.id}`;
  const [draft] = useState(() => { try { return JSON.parse(localStorage.getItem(draftKey)) || {}; } catch { return {}; } });
  const [currentQ, setCurrentQ] = useState(draft.currentQ || 1);
  const [responses, setResponses] = useState(draft.responses || {});
  const [statuses, setStatuses] = useState(draft.statuses || Object.fromEntries(Array.from({length:test.totalQuestions}, (_,i) => [i+1,i ? 'not-visited':'not-answered'])));
  const [deadline] = useState(() => draft.deadline || Date.now() + test.duration * 60000);
  const [attemptId] = useState(() => draft.attemptId || crypto.randomUUID());
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, Math.ceil((deadline-Date.now())/1000)));
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [paletteFilter,setPaletteFilter]=useState('all');
  const [shortcuts,setShortcuts]=useState(false);
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved on this device');
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [focusExits, setFocusExits] = useState(draft.focusExits || 0);
  const busy = useRef(false);
  const autoSubmitted = useRef(false);
  const submitRef = useRef(null);
  // Storage synchronization reports quota and browser privacy failures to the candidate.
  /* eslint-disable react/set-state-in-effect */
  useEffect(() => {
    try { localStorage.setItem(draftKey, JSON.stringify({currentQ,responses,statuses,deadline,attemptId,focusExits})); setSaveStatus('Saved on this device'); }
    catch { setSaveStatus('Local saving unavailable. Keep this tab open.'); }
  }, [draftKey,currentQ,responses,statuses,deadline,attemptId,focusExits]);
  /* eslint-enable react/set-state-in-effect */
  useEffect(() => {
    const tick = () => setTimeLeft(Math.max(0,Math.ceil((deadline-Date.now())/1000)));
    const timer = setInterval(tick, 500);
    const warn = e => { e.preventDefault(); e.returnValue = ''; };
    const change = () => setFullscreen(!!document.fullscreenElement);
    const visibility = () => { if(document.hidden) setFocusExits(n=>n+1); tick(); };
    window.addEventListener('beforeunload',warn);
    document.addEventListener('fullscreenchange',change);
    document.addEventListener('visibilitychange',visibility);
    return () => { clearInterval(timer); window.removeEventListener('beforeunload',warn); document.removeEventListener('fullscreenchange',change); document.removeEventListener('visibilitychange',visibility); };
  }, [deadline]);
  const toggleFullscreen = async () => {
    try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
    catch { setSubmitError('Fullscreen is unavailable in this browser. You can continue in this window.'); }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getSelectedOption = () => responses[currentQ] || null;

  const navigateTo = (qNum) => {
    if(qNum < 1 || qNum > test.totalQuestions) return;
    setStatuses(prev => {
      const next = { ...prev };
      if (next[currentQ] === 'not-visited') next[currentQ] = 'not-answered';
      if (next[qNum] === 'not-visited') next[qNum] = 'not-answered';
      return next;
    });
    setCurrentQ(qNum);
  };

  const handleOptionSelect = (opt) => {
    if (!timeLeft || busy.current) return;
    setResponses(prev => ({ ...prev, [currentQ]: opt }));
    setStatuses(prev => ({...prev, [currentQ]: prev[currentQ]?.includes('marked') ? 'marked-answered' : 'answered'}));
  };

  const handleSaveNext = () => {
    const ans = getSelectedOption();
    setStatuses(prev => ({ ...prev, [currentQ]: ans ? 'answered' : 'not-answered' }));
    if (currentQ < test.totalQuestions) navigateTo(currentQ + 1);
  };

  const handleClear = () => {
    if (!timeLeft || busy.current) return;
    setResponses(prev => {
      const next = { ...prev };
      delete next[currentQ];
      return next;
    });
    setStatuses(prev => ({ ...prev, [currentQ]: 'not-answered' }));
  };

  const handleSaveMarkReview = () => {
    const ans = getSelectedOption();
    setStatuses(prev => ({ ...prev, [currentQ]: ans ? 'marked-answered' : 'marked' }));
    if (currentQ < test.totalQuestions) navigateTo(currentQ + 1);
  };

  const handleMarkReviewNext = () => {
    setStatuses(prev => ({ ...prev, [currentQ]: getSelectedOption() ? 'marked-answered' : 'marked' }));
    if (currentQ < test.totalQuestions) navigateTo(currentQ + 1);
  };

  const processSubmission = async () => {
    if (busy.current) return;
    busy.current = true; setSaving(true); setSubmitError('');
    try {
      const result = scoreAttempt(test, responses);
      await onFinish(test.id, {...result, attemptId, responses, answerKey: test.answerKey, focusExits,
        elapsedSeconds: Math.min(test.duration*60, Math.max(0, Math.round((Date.now()-(deadline-test.duration*60000))/1000)))});
      try { localStorage.removeItem(draftKey); } catch { /* Storage may be disabled. */ }
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    } catch(error) { setSubmitError(error.message); setShowSubmitModal(false); }
    finally { busy.current = false; setSaving(false); }
  };
  useEffect(() => { submitRef.current = processSubmission; });
  useEffect(() => {
    if (timeLeft === 0 && !autoSubmitted.current) { autoSubmitted.current = true; submitRef.current?.(); }
  }, [timeLeft]);


  const getStatusColor = (status) => {
    switch(status) {
      case 'answered': return 'bg-emerald-500 text-white border-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.3)]';
      case 'not-answered': return 'bg-rose-500 text-white border-rose-600 shadow-[0_4px_10px_rgba(244,63,94,0.3)]';
      case 'marked': return 'bg-violet-500 text-white border-violet-600 shadow-[0_4px_10px_rgba(139,92,246,0.3)]';
      case 'marked-answered': return 'bg-violet-500 text-white border-violet-600 shadow-[0_4px_10px_rgba(139,92,246,0.3)] relative after:content-["•"] after:absolute after:-bottom-2 after:right-0 after:text-emerald-300 after:text-3xl';
      default: return 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:text-slate-700';
    }
  };

  const getSummary = () => {
    const summary = { answered: 0, 'not-answered': 0, marked: 0, 'marked-answered': 0, 'not-visited': 0 };
    Object.values(statuses).forEach(s => summary[s] = (summary[s] || 0) + 1);
    return summary;
  };

  useEffect(() => {
    const handleKey = e => {
      if (showSubmitModal || ['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if(['a','b','c','d'].includes(key)) handleOptionSelect(key.toUpperCase());
      else if(key==='arrowright') { e.preventDefault(); navigateTo(currentQ+1); }
      else if(key==='arrowleft') { e.preventDefault(); navigateTo(currentQ-1); }
      else if(key==='r' && timeLeft && !saving) handleMarkReviewNext();
    };
    window.addEventListener('keydown',handleKey);
    return () => window.removeEventListener('keydown',handleKey);
  });
  const summary = getSummary();

  return (
    <div className="exam-shell flex h-screen flex-col bg-slate-100 overflow-hidden select-none font-sans">
      <div className="exam-toolbar"><span>{saveStatus}</span><div><button onClick={()=>setShortcuts(v=>!v)}>Keyboard help</button><button onClick={() => { if(confirm('Return to dashboard? Your draft is saved, but the timer will continue.')) onCancel(); }}>Save & leave</button><button onClick={toggleFullscreen}>{fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</button></div></div>
      {submitError && <div role="alert" className="error-banner">{submitError}<button disabled={saving} onClick={processSubmission}>Retry submission</button></div>}
      {timeLeft === 0 && <div className="error-banner">Time is up. Answers are locked. {saving ? 'Saving your result…' : 'Use Retry submission if saving failed.'}</div>}
      {shortcuts && <div className="inline-help">A–D: answer · ← →: navigate · R: mark for review. Shortcuts work outside form controls and the PDF viewer.</div>}
      <div className="exam-progress" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={test.totalQuestions} aria-valuenow={Object.keys(responses).length}><span style={{width:`${Object.keys(responses).length/test.totalQuestions*100}%`}}/></div>
      {/* NTA Premium Header */}
      <header className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 shadow-lg z-10">
        <div className="flex items-center gap-6">
          <div className="font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">FOCUS / CBT</div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="font-bold text-slate-300">{test.name}</div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Candidate</span>
            <span className="font-extrabold text-white text-base">{currentUser.name}</span>
          </div>
          <div className="bg-slate-800/80 px-5 py-2 rounded-2xl border border-slate-700/50 text-center shadow-inner flex items-center gap-4">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest text-left leading-tight">Time<br/>Left</div>
            <div className={`font-mono text-2xl font-bold tracking-wider ${timeLeft < 300 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-3 gap-3">
        {/* Left Side: Question Viewer */}
        <div className="flex-[7] flex flex-col bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex justify-between items-center shadow-sm z-10">
            <span className="font-extrabold text-slate-700 flex items-center gap-2"><BookOpen size={18} className="text-indigo-500"/> Physics, Chemistry, Biology</span>
            <span className="font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full text-sm">Question {currentQ}</span>{test.pdfUrl && <a className="paper-link" href={test.pdfUrl} target="_blank" rel="noopener noreferrer">Open paper ↗</a>}
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4">
            {test.pdfUrl ? (
               <iframe sandbox="allow-scripts allow-same-origin" referrerPolicy="no-referrer" src={`${test.pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full rounded-2xl bg-white shadow-sm border border-slate-200" title="Question Paper"></iframe>
            ) : (
               <div className="w-full h-full border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-500 p-10 text-center rounded-2xl">
                  <div className="p-6 bg-slate-50 rounded-full mb-6"><BookOpen size={48} className="text-slate-300" /></div>
                  <p className="text-2xl font-extrabold text-slate-700 mb-2">No PDF Uploaded</p>
                  <p className="text-base font-medium max-w-md text-slate-500">Refer to your physical question paper and use the digital OMR panel on the right to record your answers.</p>
               </div>
            )}
          </div>
        </div>

        {/* Right Side: OMR & Actions */}
        <div className="flex-[3] flex flex-col bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 overflow-hidden">

          {/* Status Legend */}
          <div className="p-5 grid grid-cols-2 gap-3 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shadow-inner">{summary['not-visited']}</div> Not Visited</div>
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-t-2xl rounded-bl-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm">{summary['not-answered']}</div> Not Ans</div>
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-t-2xl rounded-br-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">{summary['answered']}</div> Answered</div>
            <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-sm">{summary['marked']}</div> Marked</div>
            <div className="flex items-center gap-3 col-span-2"><div className="w-8 h-8 rounded-full bg-violet-500 text-white flex items-center justify-center shadow-sm relative after:content-['•'] after:absolute after:-bottom-2 after:right-0 after:text-emerald-300 after:text-3xl">{summary['marked-answered']}</div> Marked & Answered</div>
          </div>

          {/* Question Palette */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
            <h3 className="font-extrabold text-xs text-indigo-800 mb-4 bg-indigo-100/50 p-3 rounded-xl uppercase tracking-widest text-center border border-indigo-100">Question Palette</h3>
            <div className="segmented" aria-label="Filter questions">{[['all','All'],['unanswered','Unanswered'],['review','Review']].map(([id,label])=><button key={id} aria-pressed={paletteFilter===id} onClick={()=>setPaletteFilter(id)}>{label}</button>)}</div>
            <div className="flex flex-wrap gap-3 justify-center">
              {Array.from({length: test.totalQuestions}).map((_, i) => {
                const qNum = i + 1;
                const status = statuses[qNum] || 'not-visited';
                if(!matchesQuestionFilter(paletteFilter,responses[qNum],status)) return null;
                let shapeClass = "rounded-xl";
                if (status === 'answered') shapeClass = "rounded-t-2xl rounded-br-2xl";
                else if (status === 'not-answered') shapeClass = "rounded-t-2xl rounded-bl-2xl";
                else if (status.includes('marked')) shapeClass = "rounded-full";

                return (
                  <button
                    key={qNum}
                    aria-label={`Question ${qNum}, ${status}`} aria-current={currentQ===qNum ? "step" : undefined}
                    onClick={() => navigateTo(qNum)}
                    className={`w-11 h-11 flex items-center justify-center font-extrabold text-sm border-2 transition-all duration-200 ${shapeClass} ${getStatusColor(status)} ${currentQ === qNum ? 'ring-4 ring-indigo-500/30 scale-110 border-indigo-500' : ''}`}
                  >
                    {qNum}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interaction Panel */}
          <div className="border-t border-slate-200 bg-white">
            <div className="p-6 border-b border-slate-100">
               <div className="flex justify-between items-center mb-6">
                 <h4 className="font-black text-slate-800 text-lg">Select Option</h4>
                 <button onClick={handleClear} className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider">Clear</button>
               </div>
               <div className="flex gap-4 justify-center">
                 {['A', 'B', 'C', 'D'].map(opt => (
                   <label key={opt} className={`flex items-center justify-center w-14 h-14 rounded-full border-2 cursor-pointer transition-all duration-200 shadow-sm ${responses[currentQ] === opt ? 'border-indigo-600 bg-indigo-600 text-white font-black scale-110 shadow-[0_8px_20px_rgba(79,70,229,0.4)]' : 'border-slate-200 text-slate-600 font-bold hover:border-indigo-300 hover:bg-indigo-50'}`}>
                     <input type="radio" name="omr-opt" value={opt} checked={responses[currentQ] === opt} onChange={() => handleOptionSelect(opt)} className="sr-only" />
                     {opt}
                   </label>
                 ))}
               </div>
            </div>

            <div className="question-navigation"><button disabled={currentQ===1} onClick={()=>navigateTo(currentQ-1)}>← Previous</button><span>{currentQ} / {test.totalQuestions}</span><button disabled={currentQ===test.totalQuestions} onClick={()=>navigateTo(currentQ+1)}>Next →</button></div>
            <div className="p-4 grid grid-cols-2 gap-3 bg-slate-50">
              <button onClick={handleSaveNext} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black py-4 px-2 rounded-2xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:-translate-y-0.5 transition-all uppercase tracking-wider">Save & Next</button>
              <button onClick={handleSaveMarkReview} className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-black py-4 px-2 rounded-2xl shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 transition-all uppercase tracking-wider">Save & Mark</button>
              <button onClick={handleMarkReviewNext} className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-black py-4 px-2 rounded-2xl shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:-translate-y-0.5 transition-all uppercase tracking-wider">Mark & Next</button>
              <button onClick={() => setShowSubmitModal(true)} className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-black py-4 px-2 rounded-2xl shadow-lg hover:-translate-y-0.5 transition-all uppercase tracking-wider">Submit Test</button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transform transition-all">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white text-center">
              <div className="inline-flex p-3 bg-white/10 rounded-full mb-3"><Activity size={32}/></div>
              <h3 className="font-black text-2xl tracking-wide">Confirm Submission</h3>
            </div>
            <div className="p-8">
              <p className="text-slate-600 text-center mb-8 font-medium">You are about to submit your assessment. <strong className="text-slate-800">No further changes can be made.</strong></p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100"><div className="text-3xl font-black text-emerald-600 mb-1">{Object.keys(responses).length}</div><div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Answered</div></div>
                <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100"><div className="text-3xl font-black text-rose-600 mb-1">{test.totalQuestions - Object.keys(responses).length}</div><div className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Unanswered</div></div>
                <div className="bg-violet-50 p-4 rounded-2xl text-center border border-violet-100"><div className="text-3xl font-black text-violet-600 mb-1">{summary.marked}</div><div className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Marked</div></div>
                <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100"><div className="text-3xl font-black text-blue-600 mb-1">{summary['marked-answered']}</div><div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Marked + Ans</div></div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowSubmitModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-extrabold py-4 rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-wider text-sm">Cancel</button>
                <button disabled={saving} onClick={processSubmission} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-4 rounded-2xl shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all uppercase tracking-wider text-sm">{saving ? 'Saving…' : 'Final submit'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AttemptHistory({ attempts }) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [reviewFilter,setReviewFilter]=useState("all");
  const filtered = attempts.filter(a => `${a.testName} ${a.studentName}`.toLowerCase().includes(search.toLowerCase()));
  const exportCSV = () => {
    const rows = [['Test','Student','Date','Score','Correct','Incorrect','Skipped','Seconds'], ...filtered.map(a => [a.testName,a.studentName,new Date(a.submittedAt).toISOString(),a.totalScore,a.correct,a.incorrect,a.unattempted,a.elapsedSeconds || ''])];
    const csv = rows.map(row => row.map(v => '"'+String(v ?? '').replace(/^[=+@-]/,"'").replaceAll('"','""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const link=document.createElement('a'); link.href=url; link.download='attempt-history.csv'; link.click(); URL.revokeObjectURL(url);
  };
  return <section className="history surface"><div className="section-heading"><div><p className="eyebrow">YOUR PROGRESS, PRESERVED</p><h2>Attempt library</h2></div><button onClick={exportCSV} disabled={!filtered.length}>Export CSV</button></div>
    <input aria-label="Search attempts" placeholder="Search tests or students…" value={search} onChange={e=>setSearch(e.target.value)}/>
    {!filtered.length ? <p className="empty-state">Completed tests will appear here with scores and answer-by-answer review.</p> : <div className="table-scroll"><table><thead><tr><th>Assessment</th><th>Date</th><th>Score</th><th>Accuracy</th><th></th></tr></thead><tbody>{filtered.map(a=><tr key={a.id}><td><strong>{a.testName}</strong><small>{a.studentName}</small></td><td>{new Date(a.submittedAt).toLocaleString()}</td><td>{a.totalScore} / {a.totalQs*4}</td><td>{a.correct+a.incorrect ? Math.round(a.correct/(a.correct+a.incorrect)*100) : 0}%</td><td><button onClick={()=>{setReviewFilter("all");setSelected(a);}}>Review</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="review-overlay" role="dialog" aria-modal="true" aria-label="Attempt review"><div className="surface review-panel"><div className="section-heading"><h2>{selected.testName}</h2><button autoFocus onClick={()=>setSelected(null)}>Close</button></div><p>{selected.correct} correct · {selected.incorrect} incorrect · {selected.unattempted} skipped · {selected.elapsedSeconds ? Math.round(selected.elapsedSeconds/60)+' minutes' : 'Time not recorded'}</p><p>Tab switches: {selected.focusExits ?? 'Not recorded'}</p><div className="segmented">{["all","incorrect","skipped"].map(f=><button key={f} aria-pressed={reviewFilter===f} onClick={()=>setReviewFilter(f)}>{f}</button>)}</div><div className="answer-review">{Array.from({length:selected.totalQs},(_,i)=>{const q=i+1, answer=selected.responses?.[q], key=selected.answerKey?.[q]; if(reviewFilter==="incorrect" && (!key || !answer || answer===key)) return null; if(reviewFilter==="skipped" && answer) return null; return <div key={q} className={key ? answer===key ? 'correct' : answer ? 'incorrect' : '' : ''}><strong>Q{q}</strong><span>Your answer: {answer || 'Skipped'}</span><span>Correct: {key || 'Not recorded for this older attempt'}</span></div>;})}</div></div></div>}
  </section>;
}
