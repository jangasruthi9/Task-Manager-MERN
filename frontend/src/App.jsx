import React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const blankForm = { title: '', description: '', priority: 'Medium', status: 'Pending', dueDate: '' };

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed. Check the backend and try again.');
  return data;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (priorityFilter !== 'All') params.set('priority', priorityFilter);
      const data = await request(`/tasks?${params.toString()}`);
      setTasks(data); setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const counts = useMemo(() => ({
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    progress: tasks.filter(t => t.status === 'In Progress').length,
    pending: tasks.filter(t => t.status === 'Pending').length
  }), [tasks]);

  function updateForm(event) { setForm({ ...form, [event.target.name]: event.target.value }); }
  function resetForm() { setForm(blankForm); setEditingId(null); }

  async function submitTask(event) {
    event.preventDefault();
    setError(''); setNotice('');
    try {
      const payload = { ...form, dueDate: form.dueDate || null };
      if (editingId) {
        await request(`/tasks/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setNotice('Task updated successfully.');
      } else {
        await request('/tasks', { method: 'POST', body: JSON.stringify(payload) });
        setNotice('Task created successfully.');
      }
      resetForm(); await loadTasks();
    } catch (err) { setError(err.message); }
  }

  function editTask(task) {
    setEditingId(task._id);
    setForm({ title: task.title, description: task.description || '', priority: task.priority, status: task.status, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function changeStatus(task) {
    const next = task.status === 'Pending' ? 'In Progress' : task.status === 'In Progress' ? 'Completed' : 'Pending';
    try { await request(`/tasks/${task._id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); await loadTasks(); }
    catch (err) { setError(err.message); }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This cannot be undone.`)) return;
    try { await request(`/tasks/${task._id}`, { method: 'DELETE' }); setNotice('Task deleted.'); await loadTasks(); }
    catch (err) { setError(err.message); }
  }

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">✓</span><span>TaskFlow<small>PERSONAL TASK MANAGER</small></span></a><span className="top-label">Plan clearly. Get things done.</span></header>
    <main id="top" className="main-content">
      <section className="welcome"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>Make room for <span>great work.</span></h1><p className="subheading">Organize your day, focus on priorities, and keep your progress moving.</p></div><div className="date-chip">◷ &nbsp; Stay on track</div></section>
      <section className="stats-grid" aria-label="Task summary">
        <Stat label="Total tasks" value={counts.total} icon="▤" tone="blue" />
        <Stat label="To do" value={counts.pending} icon="◷" tone="amber" />
        <Stat label="In progress" value={counts.progress} icon="↗" tone="violet" />
        <Stat label="Completed" value={counts.completed} icon="✓" tone="green" />
      </section>
      <div className="content-grid">
        <section className="panel form-panel"><div className="panel-heading"><div><p className="eyebrow">TASK DETAILS</p><h2>{editingId ? 'Edit task' : 'Create a task'}</h2></div><span className="plus-mark">{editingId ? '✎' : '+'}</span></div>
          <form onSubmit={submitTask} className="task-form">
            <label>Task title <span>*</span><input name="title" value={form.title} onChange={updateForm} maxLength="120" placeholder="e.g. Finish project documentation" required /></label>
            <label>Description<textarea name="description" value={form.description} onChange={updateForm} rows="3" maxLength="1000" placeholder="Add a few details to help you get started…" /></label>
            <div className="form-row"><label>Priority<select name="priority" value={form.priority} onChange={updateForm}><option>Low</option><option>Medium</option><option>High</option></select></label><label>Status<select name="status" value={form.status} onChange={updateForm}><option>Pending</option><option>In Progress</option><option>Completed</option></select></label></div>
            <label>Due date<input type="date" name="dueDate" value={form.dueDate} onChange={updateForm} /></label>
            <div className="form-actions"><button className="primary-button" type="submit">{editingId ? 'Save changes' : '+ Add task'}</button>{editingId && <button className="secondary-button" type="button" onClick={resetForm}>Cancel</button>}</div>
          </form>
          <p className="form-footnote">Your tasks are saved in your MongoDB database.</p>
        </section>
        <section className="panel list-panel"><div className="panel-heading list-heading"><div><p className="eyebrow">YOUR TASK LIST</p><h2>All tasks <span className="count-pill">{tasks.length}</span></h2></div><button className="refresh-button" onClick={loadTasks} title="Refresh tasks" aria-label="Refresh tasks">↻</button></div>
          <div className="search-wrap"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…" aria-label="Search tasks" /></div>
          <div className="filters"><label><span>Status</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>All</option><option>Pending</option><option>In Progress</option><option>Completed</option></select></label><label><span>Priority</span><select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option></select></label></div>
          {error && <div className="alert error-alert" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          {notice && <div className="alert success-alert" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
          <div className="task-list">{loading ? <div className="empty-state"><div className="loader"/><p>Loading your tasks…</p></div> : tasks.length === 0 ? <div className="empty-state"><div className="empty-icon">☷</div><h3>No tasks found</h3><p>{search || statusFilter !== 'All' || priorityFilter !== 'All' ? 'Try changing your search or filters.' : 'Add your first task using the form to get started.'}</p></div> : tasks.map(task => <TaskCard key={task._id} task={task} onEdit={editTask} onDelete={deleteTask} onStatus={changeStatus} />)}</div>
          <div className="list-footer">Showing {tasks.length} task{tasks.length === 1 ? '' : 's'} · Changes sync with the database</div>
        </section>
      </div>
      <footer className="footer">TaskFlow <span>·</span> Built with MongoDB, Express, React &amp; Node.js</footer>
    </main>
  </div>;
}

function Stat({ label, value, icon, tone }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><p>{label}</p><strong>{value}</strong></div></div>; }
function TaskCard({ task, onEdit, onDelete, onStatus }) {
  const overdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().toDateString()) && task.status !== 'Completed';
  return <article className={`task-card ${task.status === 'Completed' ? 'is-completed' : ''}`}>
    <button className={`status-check ${task.status === 'Completed' ? 'checked' : ''}`} onClick={() => onStatus(task)} title={`Current status: ${task.status}. Click to advance status.`} aria-label={`Change status for ${task.title}`}>{task.status === 'Completed' ? '✓' : task.status === 'In Progress' ? '↗' : ''}</button>
    <div className="task-main"><div className="task-title-row"><h3>{task.title}</h3><span className={`priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span></div>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-meta"><span className={`status-label ${task.status.toLowerCase().replaceAll(' ', '-')}`}>{task.status}</span>{task.dueDate && <span className={overdue ? 'due-date overdue' : 'due-date'}>▦ {overdue ? 'Overdue · ' : 'Due · '}{new Date(`${task.dueDate.slice(0,10)}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>}</div>
    </div><div className="task-actions"><button onClick={() => onEdit(task)} title="Edit task" aria-label={`Edit ${task.title}`}>✎</button><button onClick={() => onDelete(task)} title="Delete task" aria-label={`Delete ${task.title}`} className="delete-action">⌫</button></div>
  </article>;
}

export default App;
