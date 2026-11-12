import React, {useMemo} from 'react';
import {Activity, BookOpen, Target} from 'lucide-react';
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
export function AdminAnalytics({ attempts }) {
  const chartData = useMemo(() => {
    return [...attempts].sort((a,b) => a.submittedAt-b.submittedAt).map((a, i) => ({
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
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Progress overview</h2>
        <span className="bg-indigo-100 text-indigo-700 font-bold px-4 py-1 rounded-full text-sm">Target: NEET 2027</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Attempts', value: attempts.length, icon: BookOpen, color: 'blue' },
          { label: 'Average Score', value: avgScore, icon: Activity, color: 'indigo' },
          { label: 'Highest Score', value: highestScore, icon: Target, color: 'emerald' }
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-6 transition-transform hover:-translate-y-1">
            <div className={`p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner`}>
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
          <h3 className="text-xl font-bold text-slate-800 mb-8">Score trend</h3>
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
                <Line yAxisId="left" type="monotone" dataKey="score" stroke="#426759" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} name="Total Score" />
                <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#8aada0" strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} name="Accuracy (%)" />
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


export function StudentAnalytics({ attempts }) {
  const chartData = useMemo(() => {
    return [...attempts].sort((a,b) => a.submittedAt-b.submittedAt).map((a, i) => ({
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
               <h3 className="text-2xl font-extrabold text-slate-800">Scores</h3>
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
                       <stop offset="0%" stopColor="#7c9b89" stopOpacity={1}/>
                       <stop offset="100%" stopColor="#426759" stopOpacity={0.8}/>
                     </linearGradient>
                   </defs>
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

        </>
      )}
    </div>
  );
}
