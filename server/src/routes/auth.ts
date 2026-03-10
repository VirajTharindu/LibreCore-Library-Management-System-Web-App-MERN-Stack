import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { usersDb, UserDoc } from '../db/pouchdb';
import { getJwtSecret } from '../middleware/auth';

const router = Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, displayName } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }
    const id = `user_${username.toLowerCase()}`;
    try {
      const existing = await usersDb.get<UserDoc>(id);
      if (existing) {
        res.status(409).json({ error: 'Username already exists' });
        return;
      }
    } catch {
      // not found, ok to create
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const doc: UserDoc = {
      _id: id,
      type: 'user',
      username: username.toLowerCase(),
      passwordHash,
      displayName: displayName || username,
      role: 'member',
      createdAt: new Date().toISOString(),
    };
    await usersDb.put(doc);
    const token = jwt.sign(
      { userId: id, username: doc.username, role: doc.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { id: doc._id, username: doc.username, displayName: doc.displayName, role: doc.role },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const id = `user_${username.toLowerCase()}`;
    let doc: UserDoc;
    try {
      doc = await usersDb.get<UserDoc>(id);
    } catch {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    const valid = await bcrypt.compare(password, doc.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    const token = jwt.sign(
      { userId: doc._id, username: doc.username, role: doc.role },
      getJwtSecret(),
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: doc._id, username: doc.username, displayName: doc.displayName, role: doc.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
