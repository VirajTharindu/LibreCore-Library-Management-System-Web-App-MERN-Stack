import { Router, Response } from 'express';
import { borrowingsDb, booksDb, BorrowingDoc, BookDoc } from '../db/pouchdb';
import { AuthRequest, authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await borrowingsDb.allDocs<BorrowingDoc>({ include_docs: true });
    const list = result.rows
      .filter((r) => r.doc && r.doc.type === 'borrowing')
      .map((r) => ({
        id: r.doc!._id,
        bookId: r.doc!.bookId,
        userId: r.doc!.userId,
        borrowedAt: r.doc!.borrowedAt,
        dueDate: r.doc!.dueDate,
        returnedAt: r.doc!.returnedAt,
        status: r.doc!.status,
      }));
    res.json(list);
  } catch (err) {
    console.error('List borrowings error:', err);
    res.status(500).json({ error: 'Failed to list borrowings' });
  }
});

router.post('/borrow', requireRole('admin', 'librarian', 'member'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { bookId } = req.body;
    const userId = req.user!.userId;
    if (!bookId) {
      res.status(400).json({ error: 'bookId is required' });
      return;
    }
    const book = await booksDb.get<BookDoc>(bookId);
    if (book.type !== 'book' || book.available < 1) {
      res.status(400).json({ error: 'Book not available' });
      return;
    }
    const due = new Date();
    due.setDate(due.getDate() + 14);
    const id = `borrowing_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const doc: BorrowingDoc = {
      _id: id,
      type: 'borrowing',
      bookId,
      userId,
      borrowedAt: new Date().toISOString(),
      dueDate: due.toISOString(),
      status: 'active',
    };
    await borrowingsDb.put(doc);
    book.available -= 1;
    book.updatedAt = new Date().toISOString();
    await booksDb.put(book);
    res.status(201).json({
      id: doc._id,
      bookId: doc.bookId,
      userId: doc.userId,
      borrowedAt: doc.borrowedAt,
      dueDate: doc.dueDate,
      status: doc.status,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    console.error('Borrow error:', err);
    res.status(500).json({ error: 'Failed to borrow book' });
  }
});

router.post('/return/:id', requireRole('admin', 'librarian', 'member'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const borrowing = await borrowingsDb.get<BorrowingDoc>(req.params.id);
    if (borrowing.type !== 'borrowing' || borrowing.status !== 'active') {
      res.status(400).json({ error: 'Borrowing not active' });
      return;
    }
    if (borrowing.userId !== req.user!.userId && !['admin', 'librarian'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Not allowed to return this borrowing' });
      return;
    }
    borrowing.returnedAt = new Date().toISOString();
    borrowing.status = 'returned';
    await borrowingsDb.put(borrowing);
    const book = await booksDb.get<BookDoc>(borrowing.bookId);
    book.available += 1;
    book.updatedAt = new Date().toISOString();
    await booksDb.put(book);
    res.json({ id: borrowing._id, status: 'returned' });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 404) {
      res.status(404).json({ error: 'Borrowing not found' });
      return;
    }
    console.error('Return error:', err);
    res.status(500).json({ error: 'Failed to return book' });
  }
});

export default router;
