import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import type { Book } from '../types';
import type { WsMessage } from '../services/websocket';
import './Dashboard.css';

const canEdit = (role: string) => role === 'admin' || role === 'librarian';

export default function Dashboard() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBooks = useCallback(async () => {
    try {
      const list = await api.books.list();
      setBooks(list);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useWebSocket((msg: WsMessage) => {
    if (msg.type === 'books:changed') {
      if (msg.action === 'created' && msg.book) {
        setBooks((prev) => [...prev, msg.book as Book]);
      } else if (msg.action === 'updated' && msg.book) {
        setBooks((prev) =>
          prev.map((b) => (b.id === (msg.book as Book).id ? (msg.book as Book) : b))
        );
      } else if (msg.action === 'deleted' && msg.bookId) {
        setBooks((prev) => prev.filter((b) => b.id !== msg.bookId));
      }
    }
  });

  if (loading) return <div className="page-loading">Loading books…</div>;
  if (error) return <div className="page-error">{error}</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Books</h1>
        {canEdit(user?.role ?? '') && (
          <Link to="/books/new" className="btn btn-primary">
            Add book
          </Link>
        )}
      </div>
      <div className="books-grid">
        {books.length === 0 ? (
          <p className="empty-state">No books yet. Add one to get started.</p>
        ) : (
          books.map((book) => (
            <article key={book.id} className="book-card">
              <Link to={`/books/${book.id}`} className="book-card-link">
                <h3>{book.title}</h3>
                <p className="book-author">{book.author}</p>
                {book.genre && <span className="book-genre">{book.genre}</span>}
                <p className="book-availability">
                  {book.available} / {book.quantity} available
                </p>
              </Link>
              {canEdit(user?.role ?? '') && (
                <Link to={`/books/${book.id}/edit`} className="btn btn-ghost btn-sm">
                  Edit
                </Link>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
