import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import './Form.css';

export default function BookForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    year: new Date().getFullYear(),
    quantity: 1,
  });

  useEffect(() => {
    if (!id) return;
    api.books
      .get(id)
      .then((book) => {
        setForm({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          genre: book.genre,
          year: book.year,
          quantity: book.quantity,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEdit && id) {
        await api.books.update(id, form);
        navigate(`/books/${id}`);
      } else {
        const book = await api.books.create(form);
        navigate(`/books/${book.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loading">Loading…</div>;

  return (
    <div className="form-page">
      <h1>{isEdit ? 'Edit book' : 'Add book'}</h1>
      <form onSubmit={handleSubmit} className="form-card">
        {error && <div className="form-error">{error}</div>}
        <label>
          Title *
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>
        <label>
          Author *
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
            required
          />
        </label>
        <label>
          ISBN
          <input
            type="text"
            value={form.isbn}
            onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
          />
        </label>
        <label>
          Genre
          <input
            type="text"
            value={form.genre}
            onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
          />
        </label>
        <label>
          Year
          <input
            type="number"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value, 10) || 0 }))}
            min={1000}
            max={2100}
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            value={form.quantity}
            onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value, 10) || 0 }))}
            min={0}
          />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
