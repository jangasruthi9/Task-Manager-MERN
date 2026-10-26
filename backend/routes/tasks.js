import express from 'express';
import Task from '../models/Task.js';

const router = express.Router();

// GET /api/tasks?search=&status=&priority=
router.get('/', async (req, res, next) => {
  try {
    const { search, status, priority } = req.query;
    const filter = {};
    if (status && status !== 'All') filter.status = status;
    if (priority && priority !== 'All') filter.priority = priority;
    if (search?.trim()) filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } }
    ];
    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) { next(error); }
});

// POST /api/tasks
router.post('/', async (req, res, next) => {
  try {
    const { title, description, priority, status, dueDate } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Please enter a task title.' });
    const task = await Task.create({ title, description, priority, status, dueDate: dueDate || null });
    res.status(201).json(task);
  } catch (error) { next(error); }
});

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json(task);
  } catch (error) { next(error); }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });
    res.json({ message: 'Task deleted successfully.' });
  } catch (error) { next(error); }
});

export default router;
