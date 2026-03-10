import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Borrowing } from '../types';
import type { Book } from '../types';
import './Borrowings.css';

export default function Borrowings() {
  const { user } = useAuth();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [books, setBooks] = useState<Record<string, Book>>({});
  const [loading, setLoading] = useState(true);
  const [returningId, setReturningId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.borrowings.list(), api.books.list()])
      .then(([borrows, bookList]) => {
        setBorrowings(borrows);
        const map: Record<string, Book> = {};
        bookList.forEach((b) => (map[b.id] = b));
        setBooks(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleReturn = async (id: string) => {
    setReturningId(id);
    try {
      await api.borrowings.return(id);
      setBorrowings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'returned' as const } : b))
      );
      const b = borrowings.find((x) => x.id === id);
      if (b && books[b.bookId]) {
        setBooks((prev) => ({
          ...prev,
          [b.bookId]: { ...books[b.bookId], available: books[b.bookId].available + 1 },
        }));
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Return failed');
    } finally {
      setReturningId(null);
    }
  };

  const canReturn = (b: Borrowing) =>
    b.status === 'active' &&
    (user?.role === 'admin' || user?.role === 'librarian' || b.userId === user?.id);

  if (loading) return <div className="page-loading">Loading borrowings…</div>;

  const active = borrowings.filter((b) => b.status === 'active');
  const returned = borrowings.filter((b) => b.status === 'returned');

  return (
    <div className="borrowings-page">
      <h1>Borrowings</h1>
      {borrowings.length === 0 ? (
        <p className="empty-state">No borrowings yet.</p>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h2>Active</h2>
              <ul className="borrowings-list">
                {active.map((b) => (
                  <li key={b.id} className="borrowings-item">
                    <div>
                      <Link to={`/books/${b.bookId}`}>{books[b.bookId]?.title ?? b.bookId}</Link>
                      <span className="borrowings-meta">
                        Due: {new Date(b.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    {canReturn(b) && (
                      <button
                        type="button"
                        className="btn btn-success btn-sm"
                        onClick={() => handleReturn(b.id)}
                        disabled={returningId === b.id}
                      >
                        {returningId === b.id ? 'Returning…' : 'Return'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {returned.length > 0 && (
            <section>
              <h2>Returned</h2>
              <ul className="borrowings-list">
                {returned.map((b) => (
                  <li key={b.id} className="borrowings-item returned">
                    <div>
                      <Link to={`/books/${b.bookId}`}>{books[b.bookId]?.title ?? b.bookId}</Link>
                      <span className="borrowings-meta">
                        Returned: {b.returnedAt ? new Date(b.returnedAt).toLocaleDateString() : '-'}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
