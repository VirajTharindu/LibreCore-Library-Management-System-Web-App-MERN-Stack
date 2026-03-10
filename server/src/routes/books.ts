import { Router, Response } from 'express';
import { booksDb, BookDoc } from '../db/pouchdb';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';
import { broadcast } from '../websocket/handler';

const router = Router();
router.use(authMiddleware);

function toBookResponse(doc: BookDoc) {
  return {
    id: doc._id,
    title: doc.title,
    author: doc.author,
    isbn: doc.isbn,
    genre: doc.genre,
    year: doc.year,
    quantity: doc.quantity,
    available: doc.available,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await booksDb.allDocs<BookDoc>({ include_docs: true });
    const books = result.rows
      .filter((r) => r.doc && r.doc.type === 'book')
      .map((r) => toBookResponse(r.doc!));
    res.json(books);
  } catch (err) {
    console.error('List books error:', err);
    res.status(500).json({ error: 'Failed to list books' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const doc = await booksDb.get<BookDoc>(id);
    if (doc.type !== 'book') {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.json(toBookResponse(doc));
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    console.error('Get book error:', err);
    res.status(500).json({ error: 'Failed to get book' });
  }
});

router.post('/', requireRole('admin', 'librarian'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, author, isbn, genre, year, quantity } = req.body;
    if (!title || !author) {
      res.status(400).json({ error: 'Title and author are required' });
      return;
    }
    const id = `book_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    const qty = Math.max(0, parseInt(String(quantity), 10) || 1);
    const doc: BookDoc = {
      _id: id,
      type: 'book',
      title: String(title).trim(),
      author: String(author).trim(),
      isbn: String(isbn || '').trim(),
      genre: String(genre || '').trim(),
      year: parseInt(String(year), 10) || new Date().getFullYear(),
      quantity: qty,
      available: qty,
      createdAt: now,
      updatedAt: now,
    };
    await booksDb.put(doc);
    broadcast({ type: 'books:changed', action: 'created', book: toBookResponse(doc) });
    res.status(201).json(toBookResponse(doc));
  } catch (err) {
    console.error('Create book error:', err);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

router.put('/:id', requireRole('admin', 'librarian'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const { title, author, isbn, genre, year, quantity } = req.body;
    const existing = await booksDb.get<BookDoc>(id);
    if (existing.type !== 'book') {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    const qty = Math.max(0, parseInt(String(quantity), 10));
    const availableDelta = qty - existing.quantity;
    const doc: BookDoc = {
      ...existing,
      title: title !== undefined ? String(title).trim() : existing.title,
      author: author !== undefined ? String(author).trim() : existing.author,
      isbn: isbn !== undefined ? String(isbn).trim() : existing.isbn,
      genre: genre !== undefined ? String(genre).trim() : existing.genre,
      year: year !== undefined ? parseInt(String(year), 10) : existing.year,
      quantity: !isNaN(qty) ? qty : existing.quantity,
      available: Math.max(0, existing.available + (isNaN(availableDelta) ? 0 : availableDelta)),
      updatedAt: new Date().toISOString(),
    };
    await booksDb.put(doc);
    broadcast({ type: 'books:changed', action: 'updated', book: toBookResponse(doc) });
    res.json(toBookResponse(doc));
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    console.error('Update book error:', err);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

router.delete('/:id', requireRole('admin', 'librarian'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    const doc = await booksDb.get<BookDoc>(id);
    if (doc.type !== 'book') {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    await booksDb.remove({ _id: doc._id, _rev: doc._rev! });
    broadcast({ type: 'books:changed', action: 'deleted', bookId: id });
    res.status(204).send();
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    console.error('Delete book error:', err);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

export default router;
