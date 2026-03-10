import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="layout-brand">
          LibreCore
        </Link>
        <nav className="layout-nav">
          <Link to="/">Books</Link>
          <Link to="/borrowings">Borrowings</Link>
          <span className="layout-user">
            {user?.displayName || user?.username} ({user?.role})
          </span>
          <button type="button" onClick={handleLogout} className="btn btn-ghost">
            Logout
          </button>
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
