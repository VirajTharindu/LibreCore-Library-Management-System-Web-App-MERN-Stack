import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Book } from '../types';
import './Detail.css';

const canEdit = (role: string) => role === 'admin' || role === 'librarian';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.books
      .get(id)
      .then(setBook)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBorrow = async () => {
    if (!id || !book || book.available < 1) return;
    setBorrowing(true);
    try {
      await api.borrowings.borrow(id);
      setBook((b) => b ? { ...b, available: b.available - 1 } : null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Borrow failed');
    } finally {
      setBorrowing(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Delete this book?')) return;
    try {
      await api.books.delete(id);
      navigate('/');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;
  if (error || !book) return <div className="page-error">{error || 'Book not found'}</div>;

  return (
    <div className="detail-page">
      <div className="detail-header">
        <h1>{book.title}</h1>
        <div className="detail-actions">
          {book.available > 0 && (
            <button
              type="button"
              className="btn btn-success"
              onClick={handleBorrow}
              disabled={borrowing}
            >
              {borrowing ? 'Borrowing…' : 'Borrow'}
            </button>
          )}
          {canEdit(user?.role ?? '') && (
            <>
              <Link to={`/books/${book.id}/edit`} className="btn btn-primary">
                Edit
              </Link>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <dl className="detail-list">
        <dt>Author</dt>
        <dd>{book.author}</dd>
        {book.isbn && (
          <>
            <dt>ISBN</dt>
            <dd>{book.isbn}</dd>
          </>
        )}
        {book.genre && (
          <>
            <dt>Genre</dt>
            <dd>{book.genre}</dd>
          </>
        )}
        <dt>Year</dt>
        <dd>{book.year}</dd>
        <dt>Availability</dt>
        <dd>{book.available} of {book.quantity} available</dd>
      </dl>
      <p className="detail-back">
        <Link to="/">← Back to books</Link>
      </p>
    </div>
  );
}
