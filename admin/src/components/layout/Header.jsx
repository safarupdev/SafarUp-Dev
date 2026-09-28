import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../constants/roles';
import Button from '../ui/Button';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 flex-none items-center justify-between border-b border-slate-200 bg-white px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user?.displayName}</p>
          <p className="text-xs text-slate-500">{roleLabel(user?.role)}</p>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </header>
  );
}
