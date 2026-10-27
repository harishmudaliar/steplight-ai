import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ResumeTaskButton } from '../components/ResumeTaskButton';

type GoalTask = { id: string; title: string; notes?: string; status: string; version: number; milestone?: string; scheduled_date?: string | null; duration_minutes?: number; priority?: number; dependencies?: string[]; completion_criteria?: string };
type Goal = { id: string; title: string; description: string; outcome: string; deadline: string; skill_level: string; minutes_per_day: number; working_days: number[]; capacity: string; constraints?: string; answers?: Record<string,string>; tasks: GoalTask[]; progress: number };
type Question = { id: string; question: string; optional: boolean };

const card = 'rounded-2xl border border-surface-container-high dark:border-surface-container bg-surface-container-lowest dark:bg-[#182131] p-5 shadow-sm';

export const GoalsPage: React.FC = () => {
  const { apiClient } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [draft, setDraft] = useState({title:'', description:'', outcome:'', deadline:'', skill_level:'beginner', minutes_per_day:60, working_days:[1,2,3,4,5], capacity:'medium', constraints:''});
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [schedulePreview, setSchedulePreview] = useState<{feasible:boolean;changes:unknown[];reason?:string}|null>(null);
  const navigate = useNavigate();
  const { id } = useParams();

  const load = async () => {
    try {
      if (id) setActiveGoal(await apiClient.getGoal<Goal>(id));
      else setGoals(await apiClient.getGoals<Goal[]>());
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load goals.'); }
  };
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const goal = await apiClient.createGoal<Goal>(draft);
      const result = await apiClient.getGoalQuestions<{questions:Question[]}>(goal.id);
      setActiveGoal(goal); setQuestions(result.questions); setAnswers({}); navigate(`/goals/${goal.id}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create the goal.'); }
    finally { setBusy(false); }
  };

  const saveDiscovery = async () => {
    if (!activeGoal) return; setBusy(true); setError('');
    try { await apiClient.saveGoalAnswers(activeGoal.id, answers); const updated = await apiClient.getGoal<Goal>(activeGoal.id); setActiveGoal(updated); setQuestions([]); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not save your answers.'); } finally { setBusy(false); }
  };

  const generate = async () => {
    if (!activeGoal) return; setBusy(true); setError('');
    try { await apiClient.generateGoalRoadmap(activeGoal.id); await load(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not generate a roadmap.'); } finally { setBusy(false); }
  };

  if (!id) return <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
    <header className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold">Your goals</h1><p className="text-on-surface-variant mt-1">A steady plan shaped around your time and priorities.</p></div><button className="rounded-xl bg-primary text-white px-4 py-3 font-medium" onClick={()=>setShowCreate(true)}>Create a goal</button></header>
    {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
    {showCreate && <form onSubmit={create} className={`${card} grid gap-3`}><h2 className="text-lg font-semibold">Start with the outcome you want</h2>
      <label>Goal title<input required maxLength={255} className="block w-full rounded-lg border p-3 mt-1" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
      <label>What do you want to achieve?<textarea required maxLength={4000} className="block w-full rounded-lg border p-3 mt-1" value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
      <label>What will success look like?<textarea required maxLength={2000} className="block w-full rounded-lg border p-3 mt-1" value={draft.outcome} onChange={e=>setDraft({...draft,outcome:e.target.value})}/></label>
      <div className="grid sm:grid-cols-2 gap-3"><label>Deadline<input required type="date" min={new Date(Date.now()+86400000).toISOString().slice(0,10)} className="block w-full rounded-lg border p-3 mt-1" value={draft.deadline} onChange={e=>setDraft({...draft,deadline:e.target.value})}/></label>
      <label>Experience<select className="block w-full rounded-lg border p-3 mt-1" value={draft.skill_level} onChange={e=>setDraft({...draft,skill_level:e.target.value})}><option value="beginner">Beginner</option><option value="some experience">Some experience</option><option value="experienced">Experienced</option></select></label>
      <label>Minutes available per working day<input required type="number" min={5} max={720} className="block w-full rounded-lg border p-3 mt-1" value={draft.minutes_per_day} onChange={e=>setDraft({...draft,minutes_per_day:Number(e.target.value)})}/></label>
      <label>Daily capacity<select className="block w-full rounded-lg border p-3 mt-1" value={draft.capacity} onChange={e=>setDraft({...draft,capacity:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
      <label>Constraints or commitments<textarea maxLength={2000} className="block w-full rounded-lg border p-3 mt-1" value={draft.constraints} onChange={e=>setDraft({...draft,constraints:e.target.value})}/></label>
      <fieldset><legend className="font-medium">Working days</legend><div className="flex flex-wrap gap-2 mt-2">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day,i)=><label key={day} className="flex items-center gap-1 rounded-lg border px-3 py-2"><input type="checkbox" checked={draft.working_days.includes(i)} onChange={e=>setDraft({...draft,working_days:e.target.checked?[...draft.working_days,i]:draft.working_days.filter(d=>d!==i)})}/>{day}</label>)}</div></fieldset>
      <label className="flex gap-2 items-start rounded-xl bg-surface-container-low p-3"><input type="checkbox" checked={aiConsent} onChange={e=>setAiConsent(e.target.checked)} className="mt-1"/><span className="text-sm">I agree to send this goal, its constraints, and my answers to Google Gemini to generate clarification questions and a personalized roadmap. These details are sent only when I request AI planning.</span></label>
      <div className="flex gap-2"><button disabled={busy||!draft.working_days.length||!aiConsent} className="rounded-xl bg-primary text-white px-4 py-3 disabled:opacity-50">{busy?'Saving…':'Save goal and discover'}</button><button type="button" onClick={()=>setShowCreate(false)} className="rounded-xl border px-4 py-3">Cancel</button></div></form>}
    {goals.length===0 && !showCreate ? <div className={card}><p>No goals yet. You can start with one outcome you would like to reach.</p></div> : goals.map(g=><Link key={g.id} to={`/goals/${g.id}`} className={`${card} block hover:border-primary`}><div className="flex justify-between gap-3"><h2 className="font-semibold text-lg">{g.title}</h2><span>Due {g.deadline}</span></div><p className="text-on-surface-variant mt-2">{g.outcome}</p><div className="mt-4 h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full bg-primary" style={{width:`${g.progress}%`}}/></div><p className="mt-2 text-sm">{g.progress}% complete · {g.tasks.length} planned tasks · {g.minutes_per_day} min/day</p></Link>)}
  </div>;

  if (!activeGoal) return <div>{error || 'Loading goal…'}</div>;
  const done = activeGoal.tasks.filter(t=>t.status==='completed').length;
  return <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
    <Link to="/goals" className="text-primary underline">← All goals</Link>
    <section className={card}><div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">{activeGoal.title}</h1><p className="mt-2">{activeGoal.description}</p></div><div className="text-right"><div className="font-semibold">Deadline {activeGoal.deadline}</div><div>{activeGoal.minutes_per_day} min/day · {activeGoal.skill_level}</div></div></div><p className="mt-4"><strong>Expected outcome:</strong> {activeGoal.outcome}</p><div className="mt-4 h-2 rounded-full bg-surface-container"><div className="h-2 rounded-full bg-primary" style={{width:`${activeGoal.progress}%`}}/></div><p className="mt-2">{done} of {activeGoal.tasks.length} tasks completed ({activeGoal.progress}%)</p></section>
    {error && <p role="alert" className="text-red-700 bg-red-50 p-3 rounded-xl">{error}</p>}
    {questions.length>0 && <section className={card}><h2 className="text-lg font-semibold">A few questions to make this plan yours</h2><p className="text-sm mt-1">Skip any question you do not want to answer.</p>{questions.map(q=><label key={q.id} className="block mt-4">{q.question}{q.optional?' (optional)':''}<textarea className="block w-full rounded-lg border p-3 mt-1" value={answers[q.id]||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/></label>)}<button disabled={busy} className="mt-4 rounded-xl bg-primary text-white px-4 py-3" onClick={()=>void saveDiscovery()}>{busy?'Saving…':'Save answers'}</button></section>}
    <section className={card}><h2 className="font-semibold text-lg">Roadmap</h2>{!activeGoal.tasks.length?<><p className="mt-2">Gemini will tailor milestones and daily tasks to your goal, experience, time and deadline. Your saved notes and goal context are sent to Google for this request.</p><button disabled={busy} className="mt-4 rounded-xl bg-primary text-white px-4 py-3" onClick={()=>void generate()}>{busy?'Creating your roadmap…':'Generate personalized roadmap'}</button></>:<div className="mt-3 flex flex-col gap-3">{activeGoal.tasks.map((t,i)=><article key={t.id} className="rounded-xl border p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-primary">{t.milestone} · Step {i+1}</p><h3 className="font-semibold">{t.title}</h3><p className="text-sm mt-1">{t.notes}</p></div><span className="text-sm whitespace-nowrap">{t.status==='completed'?'Completed':t.scheduled_date||'Unscheduled'}</span></div><p className="text-sm mt-2">{t.duration_minutes} min · Priority {t.priority} · {t.completion_criteria}</p><div className="flex flex-wrap items-center gap-3 mt-3"><ResumeTaskButton taskId={t.id} label={t.status==='completed'?'View Summary':t.status==='paused'?'Resume Task':'Start / Resume Task'} className="rounded-xl bg-primary-container px-3 py-2 text-sm font-semibold"/><Link className="text-primary underline" to={`/tasks/${t.id}`}>View details</Link></div></article>)}</div>}</section>
    {activeGoal.tasks.length>0 && <section className={card}><h2 className="font-semibold">Adjust your schedule</h2><p className="text-sm mt-1">Review proposed date changes before applying them.</p><button className="mt-3 rounded-xl border px-4 py-2" onClick={async()=>{try{setSchedulePreview(await apiClient.previewGoalSchedule<typeof schedulePreview>(activeGoal.id,'User requested an updated schedule'));}catch(e){setError(e instanceof Error?e.message:'Could not calculate a schedule.')}}}>Review schedule changes</button>{schedulePreview&&<div className="mt-3"><p>{schedulePreview.feasible?'This schedule fits your current availability.':schedulePreview.reason}</p>{schedulePreview.changes.map((c:any)=><p key={c.task_id} className="text-sm">{c.title}: {c.from||'not scheduled'} → {c.to}</p>)}{schedulePreview.feasible&&schedulePreview.changes.length>0&&<button className="mt-3 rounded-xl bg-primary text-white px-4 py-2" onClick={async()=>{try{await apiClient.confirmGoalSchedule(activeGoal.id,'Reviewed and accepted schedule adjustment',schedulePreview.changes);setSchedulePreview(null);await load();}catch(e){setError(e instanceof Error?e.message:'Could not apply schedule.')}}}>Confirm schedule</button>}</div>}</section>}
  </div>;
};

export const DailyPlannerPage: React.FC = () => {
  const { apiClient } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const load = async () => { try { setGoals(await apiClient.getGoals<Goal[]>()); setError(''); } catch(e) { setError(e instanceof Error?e.message:'Could not load today’s plan.'); } };
  useEffect(()=>{ void load(); },[]); // eslint-disable-line react-hooks/exhaustive-deps
  const scheduled = goals.flatMap(g=>g.tasks.filter(t=>t.scheduled_date && t.status!=='archived').map(t=>({...t,goalTitle:g.title,goalId:g.id})));
  const todayTasks = scheduled.filter(t=>t.scheduled_date===todayKey);
  const overdue = scheduled.filter(t=>t.scheduled_date!<todayKey && t.status!=='completed');
  const completed = todayTasks.filter(t=>t.status==='completed').length;
  const remaining = todayTasks.filter(t=>t.status!=='completed');
  const totalMinutes = remaining.reduce((total,t)=>total+(t.duration_minutes||0),0);
  const changeStatus = async (task:GoalTask, status:string) => { setBusy(task.id); try { await apiClient.updateTask(task.id,{status:status as 'active'|'completed'},task.version); await load(); } catch(e) { setError(e instanceof Error?e.message:'Could not update this task.'); } finally { setBusy(null); } };
  const taskCard = (task:GoalTask & {goalTitle:string;goalId:string}, isOverdue=false) => <article key={task.id} className={`${card} p-4`}><div className="flex justify-between gap-3"><div><p className="text-xs text-primary">{task.goalTitle} · {task.milestone}</p><h3 className="font-semibold mt-1">{task.title}</h3><p className="text-sm mt-1">{task.duration_minutes} min · {isOverdue?`Scheduled ${task.scheduled_date}`:task.completion_criteria}</p></div><span className="text-sm">{task.status==='completed'?'Completed':isOverdue?'Overdue':'Today'}</span></div><div className="flex flex-wrap items-center gap-3 mt-3"><ResumeTaskButton taskId={task.id} label={task.status==='completed'?'View Summary':task.status==='paused'?'Resume Task':'Start / Resume Task'} className="rounded-xl bg-primary-container px-3 py-2 text-sm font-semibold"/><Link className="text-primary underline" to={`/tasks/${task.id}`}>View details</Link>{task.status==='completed'?<button disabled={busy===task.id} onClick={()=>void changeStatus(task,'active')} className="underline">Mark incomplete</button>:<button disabled={busy===task.id} onClick={()=>void changeStatus(task,'completed')} className="underline">{busy===task.id?'Saving…':'Mark complete'}</button>}</div></article>;
  return <div className="flex flex-col gap-5"><header><h1 className="text-2xl font-semibold">Today’s planner</h1><p className="text-on-surface-variant mt-1">{today.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'})}. Adjust the plan as your day changes.</p><Link to="/goals" className="inline-block mt-2 text-primary underline">View all goals</Link></header>{error&&<p role="alert" className="rounded-xl bg-red-50 text-red-700 p-3">{error}</p>}<section className={card}><div className="flex justify-between"><h2 className="font-semibold">Today</h2><span>{completed}/{todayTasks.length} complete</span></div><p className="text-sm mt-2">{remaining.length} remaining · about {totalMinutes} minutes</p></section>{todayTasks.length?todayTasks.map(t=>taskCard(t)):!error&&<div className={card}><p>No tasks are scheduled for today. You can review your goals or take the day at your own pace.</p><Link to="/goals" className="inline-block mt-3 text-primary underline">View goals</Link></div>}{overdue.length>0&&<section><h2 className="font-semibold text-lg mb-3">Overdue work to review</h2><div className="flex flex-col gap-3">{overdue.map(t=>taskCard(t,true))}</div><p className="text-sm text-on-surface-variant mt-2">Unfinished tasks stay in your plan until you choose a new schedule. Nothing is marked complete automatically.</p></section>}</div>;
};
