import React, { useState, useEffect, useMemo } from 'react';
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
  deleteDoc
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  LogOut,
  Play,
  PlusCircle,
  Activity,
  BookOpen,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  Trash2,
  ChevronRight,
  Sparkles,
  LayoutDashboard,
  Target
} from 'lucide-react';

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'neet-cbt-portal';

// --- MAIN APP COMPONENT ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('login');

  const [tests, setTests] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [activeTest, setActiveTest] = useState(null);

  // Initialize Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
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
    }, (err) => console.error("Error fetching tests:", err));

    const unsubAttempts = onSnapshot(attemptsRef, (snapshot) => {
      const attemptsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAttempts(attemptsData.sort((a, b) => b.submittedAt - a.submittedAt));
    }, (err) => console.error("Error fetching attempts:", err));

    return () => {
      unsubTests();
      unsubAttempts();
    };
  }, [firebaseUser]);

  const handleLogin = (role, name) => {
    setCurrentUser({ role, name });
    setView(role === 'admin' ? 'admin-dash' : 'student-dash');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
    setActiveTest(null);
  };

  const startTest = (test) => {
    setActiveTest(test);
    setView('test-env');
  };

  const finishTest = async (testId, resultData) => {
    if (!firebaseUser) return;
    try {
      const attemptsRef = collection(db, 'artifacts', appId, 'public', 'data', 'attempts');
      await addDoc(attemptsRef, {
        testId,
        testName: activeTest.name,
        studentName: currentUser.name,
        submittedAt: Date.now(),
        ...resultData
      });
      setView('student-dash');
      setActiveTest(null);
    } catch (err) {
      console.error("Error saving attempt:", err);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Activity size={48} className="text-indigo-400" />
          <h2 className="text-xl font-medium tracking-widest">INITIALIZING SECURE ENVIRONMENT</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/30 selection:text-indigo-900">
      {view === 'login' && <LoginScreen onLogin={handleLogin} />}
      {view === 'admin-dash' && <AdminDashboard tests={tests} attempts={attempts} onLogout={handleLogout} />}
      {view === 'student-dash' && <StudentDashboard tests={tests} attempts={attempts} currentUser={currentUser} onLogout={handleLogout} onStartTest={startTest} />}
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
    if (username === 'Daivik' && password === 'Daivik@2005') {
      onLogin('admin', 'Daivik');
    } else if (username === 'Soumya Sharma' && password === 'neet2027') {
      onLogin('student', 'Soumya Sharma');
    } else {
      setError('Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-black p-4 relative overflow-hidden">
      {/* Decorative blurred orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md rounded-[2.5rem] bg-white/10 backdrop-blur-2xl border border-white/20 p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-10">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 mb-6 shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">NEET CBT Portal</h1>
          <p className="text-sm text-indigo-200/80 font-medium tracking-wide uppercase">Secure Testing Environment</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90 ml-1">Username</label>
            <input
              type="text"
              className="block w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder-white/30 shadow-inner focus:border-indigo-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all duration-300"
              value={username}
              placeholder="Candidate or Admin"
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-white/90 ml-1">Password</label>
            <input
              type="password"
              className="block w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white placeholder-white/30 shadow-inner focus:border-indigo-400 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/50 transition-all duration-300"
              value={password}
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="animate-in fade-in slide-in-from-top-2 text-sm font-medium text-red-200 bg-red-900/40 border border-red-500/30 p-4 rounded-2xl backdrop-blur-md flex items-center gap-2">
              <XCircle size={18} className="text-red-400"/> {error}
            </div>
          )}
          <button
            type="submit"
            className="w-full rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-4 font-bold text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] hover:-translate-y-1 transition-all duration-300 focus:outline-none flex justify-center items-center gap-2 text-lg"
          >
            Enter Portal <ChevronRight size={20} />
          </button>
        </form>
      </div>
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
          Admin Command Center
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
              { id: 'analytics', icon: Activity, label: 'Student Analytics' },
              { id: 'create-test', icon: PlusCircle, label: 'Create New Test' },
              { id: 'manage-tests', icon: BookOpen, label: 'Manage Tests' }
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
            {activeTab === 'analytics' && <AdminAnalytics attempts={attempts} />}
            {activeTab === 'create-test' && <CreateTestForm onSuccess={() => setActiveTab('manage-tests')} />}
            {activeTab === 'manage-tests' && <ManageTests tests={tests} attempts={attempts} />}
          </div>
        </main>
      </div>
    </div>
  );
}

function AdminAnalytics({ attempts }) {
  const chartData = useMemo(() => {
    return attempts.map((a, i) => ({
      name: `Mock ${i+1}`,
      score: a.totalScore,
      accuracy: Math.round((a.correct / (a.correct + a.incorrect)) * 100) || 0
    }));
  }, [attempts]);

  const avgScore = attempts.length ? (attempts.reduce((acc, curr) => acc + curr.totalScore, 0) / attempts.length).toFixed(1) : 0;
  const highestScore = attempts.length ? Math.max(...attempts.map(a => a.totalScore)) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Performance Overview</h2>
        <span className="bg-indigo-100 text-indigo-700 font-bold px-4 py-1 rounded-full text-sm">Target: NEET 2027</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Attempts', value: attempts.length, icon: BookOpen, color: 'blue' },
          { label: 'Average Score', value: avgScore, icon: Activity, color: 'indigo' },
          { label: 'Highest Score', value: highestScore, icon: Target, color: 'emerald' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-6 transition-transform hover:-translate-y-1">
            <div className={`p-4 bg-${stat.color}-50 text-${stat.color}-600 rounded-2xl shadow-inner`}>
              <stat.icon size={32}/>
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-4xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {attempts.length > 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-8">Score Progression Timeline</h3>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dx={-10} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dx={10} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px 20px', fontWeight: 'bold' }}
                  cursor={{stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5'}}
                />
                <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#475569' }} />
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} name="Total Score" />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} name="Accuracy (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-3xl border border-dashed border-slate-300">
          <div className="p-6 bg-slate-100 rounded-full mb-4"><Activity size={48} className="text-slate-400" /></div>
          <p className="text-lg font-bold text-slate-500">No test attempts recorded yet.</p>
          <p className="text-sm text-slate-400 mt-2">Publish a test and have the candidate attempt it to see analytics.</p>
        </div>
      )}
    </div>
  );
}

function CreateTestForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(200);
  const [pdfUrl, setPdfUrl] = useState('');
  const [totalQs, setTotalQs] = useState(200);
  const [answerKey, setAnswerKey] = useState({});
  const [loading, setLoading] = useState(false);

  const generateEmptyKey = (count) => {
    const key = {};
    for (let i = 1; i <= count; i++) key[i] = 'A';
    return key;
  };

  useEffect(() => {
    setAnswerKey(generateEmptyKey(totalQs));
  }, [totalQs]);

  const handleKeyChange = (qNum, val) => {
    setAnswerKey(prev => ({ ...prev, [qNum]: val }));
  };

  const handleBulkUpload = (e) => {
    try {
      const json = JSON.parse(e.target.value);
      if (typeof json === 'object') {
        setAnswerKey(prev => ({...prev, ...json}));
      }
    } catch(err) {
      // Ignore valid JSON while typing
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      alert('Failed to create test.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><PlusCircle size={28}/></div>
        <h2 className="text-2xl font-extrabold text-slate-800">Draft New Mock Test</h2>
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
            <input type="number" max="200" required value={totalQs} onChange={e=>setTotalQs(Number(e.target.value))} className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-medium text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" />
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <div className="mb-6">
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">Answer Key Configuration</h3>
            <p className="text-sm font-medium text-slate-500">Configure manually or paste a JSON object format (e.g. <code>&#123;"1":"A", "2":"C"&#125;</code>)</p>
          </div>
          <textarea
            placeholder='Paste JSON here for bulk import...'
            className="w-full p-5 border border-slate-200 rounded-2xl mb-6 font-mono text-sm bg-slate-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
            rows={3}
            onChange={handleBulkUpload}
          />
          <div className="h-80 overflow-y-auto p-6 border border-slate-200 rounded-3xl bg-slate-50/50 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 custom-scrollbar">
            {Array.from({length: totalQs}).map((_, i) => {
              const qNum = i + 1;
              return (
                <div key={qNum} className="flex flex-col items-center p-3 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
                  <span className="text-xs font-black text-slate-400 mb-2 tracking-widest">Q{qNum}</span>
                  <select
                    value={answerKey[qNum] || 'A'}
                    onChange={e => handleKeyChange(qNum, e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-sm w-full font-bold text-center text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-slate-50 cursor-pointer"
                  >
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
          {loading ? 'Publishing Test...' : 'Publish Test to Portal'}
        </button>
      </form>
    </div>
  );
}

function ManageTests({ tests, attempts }) {
  const handleDelete = async (testId) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tests', testId));
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-8">Published Assessments</h2>
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
          <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full uppercase tracking-wider ml-2 shadow-sm">Candidate Dash</span>
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
            Available Assessments
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-4 font-extrabold text-sm border-b-[3px] transition-all ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}
          >
            My Performance Analytics
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-10">
        {activeTab === 'tests' && <StudentTestList tests={tests} onStartTest={onStartTest} />}
        {activeTab === 'results' && <StudentAnalytics attempts={attempts} />}
      </main>
    </div>
  );
}

function StudentTestList({ tests, onStartTest }) {
  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-3xl font-extrabold text-slate-800 mb-8 tracking-tight">Assigned Mock Tests</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tests.map(t => (
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
              <Play size={20} fill="currentColor" /> Enter Test Environment
            </button>
          </div>
        ))}
        {tests.length === 0 && (
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

function StudentAnalytics({ attempts }) {
  const chartData = useMemo(() => {
    return attempts.map((a, i) => ({
      name: `Mock ${i+1}`,
      score: a.totalScore,
      maxScore: a.totalQs * 4
    }));
  }, [attempts]);

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      {attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-3xl border border-dashed border-slate-300 text-slate-500">
          <Activity size={48} className="mb-4 text-slate-300" />
          <p className="text-lg font-bold">You haven't completed any tests yet.</p>
        </div>
      ) : (
        <>
          <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
             <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Activity size={24} /></div>
               <h3 className="text-2xl font-extrabold text-slate-800">Score Tracker</h3>
             </div>
             <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 0}}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                   <YAxis stroke="#94a3b8" fontSize={13} tickLine={false} axisLine={false} />
                   <Tooltip
                     cursor={{fill: '#f8fafc'}}
                     contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)', padding: '12px 20px', fontWeight: 'bold'}}
                   />
                   <Legend wrapperStyle={{ paddingTop: '20px', fontWeight: 'bold', color: '#475569' }} />
                   <Bar dataKey="score" fill="url(#colorScore)" name="Marks Obtained" radius={[8,8,0,0]} barSize={40} />
                   <defs>
                     <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                       <stop offset="0%" stopColor="#6366f1" stopOpacity={1}/>
                       <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.8}/>
                     </linearGradient>
                   </defs>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-extrabold text-slate-800 px-2">Detailed History</h3>
            {attempts.map((a, i) => (
              <div key={a.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] grid grid-cols-1 md:grid-cols-5 gap-6 items-center hover:border-indigo-100 transition-colors group">
                <div className="md:col-span-2">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(a.submittedAt).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                  <h4 className="font-extrabold text-xl text-slate-800 group-hover:text-indigo-600 transition-colors">{a.testName}</h4>
                </div>

                <div className="flex items-center gap-3 justify-start md:justify-center col-span-2">
                   <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                     <CheckCircle size={18} className="text-emerald-500"/>
                     <span className="font-extrabold text-emerald-700">{a.correct}</span>
                   </div>
                   <div className="bg-rose-50 border border-rose-100 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                     <XCircle size={18} className="text-rose-500"/>
                     <span className="font-extrabold text-rose-700">{a.incorrect}</span>
                   </div>
                   <div className="bg-slate-100 border border-slate-200 px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                     <MinusCircle size={18} className="text-slate-500"/>
                     <span className="font-extrabold text-slate-700">{a.unattempted}</span>
                   </div>
                </div>

                <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                  <span className="block text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                    {a.totalScore}
                  </span>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Out of {a.totalQs * 4}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// --- NTA TEST ENVIRONMENT ---
function TestEnvironment({ test, onFinish, onCancel, currentUser }) {
  const [currentQ, setCurrentQ] = useState(1);
  const [responses, setResponses] = useState({});
  const [statuses, setStatuses] = useState({});
  const [timeLeft, setTimeLeft] = useState(test.duration * 60);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const initialStats = {};
    for (let i = 1; i <= test.totalQuestions; i++) {
      initialStats[i] = i === 1 ? 'not-answered' : 'not-visited';
    }
    setStatuses(initialStats);
  }, [test.totalQuestions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          processSubmission();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getSelectedOption = () => responses[currentQ] || null;

  const navigateTo = (qNum) => {
    setStatuses(prev => {
      const next = { ...prev };
      if (next[currentQ] === 'not-visited') next[currentQ] = 'not-answered';
      if (next[qNum] === 'not-visited') next[qNum] = 'not-answered';
      return next;
    });
    setCurrentQ(qNum);
  };

  const handleOptionSelect = (opt) => {
    setResponses(prev => ({ ...prev, [currentQ]: opt }));
  };

  const handleSaveNext = () => {
    const ans = getSelectedOption();
    setStatuses(prev => ({ ...prev, [currentQ]: ans ? 'answered' : 'not-answered' }));
    if (currentQ < test.totalQuestions) navigateTo(currentQ + 1);
  };

  const handleClear = () => {
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

  const processSubmission = () => {
    let correct = 0, incorrect = 0, unattempted = 0;
    for (let i = 1; i <= test.totalQuestions; i++) {
      const userAns = responses[i];
      const actualAns = test.answerKey[i];
      if (!userAns) unattempted++;
      else if (userAns === actualAns) correct++;
      else incorrect++;
    }
    const totalScore = (correct * 4) + (incorrect * -1);
    onFinish(test.id, {
      totalQs: test.totalQuestions,
      correct, incorrect, unattempted, totalScore, responses
    });
  };

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

  const summary = getSummary();

  return (
    <div className="flex h-screen flex-col bg-slate-100 overflow-hidden select-none font-sans">
      {/* NTA Premium Header */}
      <header className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 shadow-lg z-10">
        <div className="flex items-center gap-6">
          <div className="font-black text-2xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">NTA CBT</div>
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
            <span className="font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full text-sm">Question {currentQ}</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4">
            {test.pdfUrl ? (
               <iframe src={`${test.pdfUrl}#toolbar=0&navpanes=0`} className="w-full h-full rounded-2xl bg-white shadow-sm border border-slate-200" title="Question Paper"></iframe>
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
            <div className="flex flex-wrap gap-3 justify-center">
              {Array.from({length: test.totalQuestions}).map((_, i) => {
                const qNum = i + 1;
                const status = statuses[qNum] || 'not-visited';
                let shapeClass = "rounded-xl";
                if (status === 'answered') shapeClass = "rounded-t-2xl rounded-br-2xl";
                else if (status === 'not-answered') shapeClass = "rounded-t-2xl rounded-bl-2xl";
                else if (status.includes('marked')) shapeClass = "rounded-full";

                return (
                  <button
                    key={qNum}
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
                     <input type="radio" name="omr-opt" value={opt} checked={responses[currentQ] === opt} onChange={() => handleOptionSelect(opt)} className="hidden" />
                     {opt}
                   </label>
                 ))}
               </div>
            </div>

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
                <div className="bg-emerald-50 p-4 rounded-2xl text-center border border-emerald-100"><div className="text-3xl font-black text-emerald-600 mb-1">{summary.answered}</div><div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Answered</div></div>
                <div className="bg-rose-50 p-4 rounded-2xl text-center border border-rose-100"><div className="text-3xl font-black text-rose-600 mb-1">{summary['not-answered'] + summary['not-visited']}</div><div className="text-[10px] font-black text-rose-700 uppercase tracking-widest">Unanswered</div></div>
                <div className="bg-violet-50 p-4 rounded-2xl text-center border border-violet-100"><div className="text-3xl font-black text-violet-600 mb-1">{summary.marked}</div><div className="text-[10px] font-black text-violet-700 uppercase tracking-widest">Marked</div></div>
                <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100"><div className="text-3xl font-black text-blue-600 mb-1">{summary['marked-answered']}</div><div className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Marked + Ans</div></div>
              </div>

              <div className="flex gap-4">
                <button onClick={() => setShowSubmitModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-extrabold py-4 rounded-2xl hover:bg-slate-200 transition-colors uppercase tracking-wider text-sm">Cancel</button>
                <button onClick={processSubmission} className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-extrabold py-4 rounded-2xl shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all uppercase tracking-wider text-sm">Final Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
