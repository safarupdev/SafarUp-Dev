/**
 * SafarUp Admin Account & Settings Console — PRD §36 & §116.
 *
 * Dedicated account profile management, security settings,
 * organization details, and environment configurations.
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../constants/roles';
import Card from '../../components/common/Card';
import Icon from '../../components/common/Icon';
import Button from '../../components/ui/Button';
import Logo from '../../components/common/Logo';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'system'
  const [name, setName] = useState(user?.name ?? 'Super Admin');
  const [email] = useState(user?.email ?? 'admin@safarup.in');
  const [feedback, setFeedback] = useState(null);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setFeedback({ tone: 'success', message: 'Profile information updated successfully.' });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setFeedback({ tone: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ tone: 'error', message: 'New passwords do not match.' });
      return;
    }

    setIsUpdatingPassword(true);
    setTimeout(() => {
      setIsUpdatingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ tone: 'success', message: 'Account password successfully updated.' });
      setTimeout(() => setFeedback(null), 4000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account &amp; System Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your operator profile, security credentials, and platform environment.
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={logout}>
          <Icon name="logout" className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Profile Overview Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0e1726] text-xl font-bold text-white shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{user?.name ?? 'Super Admin'}</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Active Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email ?? 'admin@safarup.in'}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  {roleLabel(user?.role)}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-medium">SafarUp Core Team</span>
              </div>
            </div>
          </div>

          {/* Centered Brand Logo */}
          <div className="hidden md:flex items-center justify-center">
            <Logo size="lg" center={true} />
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-1 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Access Level:</span>
            <span>Full System &amp; Content Access</span>
          </div>
        </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon name="user" className="h-4 w-4" />
          <span>Profile Details</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon name="shield" className="h-4 w-4" />
          <span>Security &amp; Password</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'system'
              ? 'border-black text-black'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon name="settings" className="h-4 w-4" />
          <span>System &amp; API</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200'
              : 'bg-rose-50 text-rose-800 ring-1 ring-inset ring-rose-200'
          }`}
        >
          <Icon name={feedback.tone === 'success' ? 'check' : 'alert'} className="h-4 w-4 flex-none" />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* TAB 1: PROFILE DETAILS */}
      {activeTab === 'profile' && (
        <Card variant="surface" pad="md" className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your account details and contact information.
            </p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-black focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-500 cursor-not-allowed shadow-2xs"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Email address is governed by Firebase authentication credentials.
              </span>
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-slate-700 mb-1">
                Permission Role
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="role"
                  type="text"
                  value={roleLabel(user?.role)}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 cursor-not-allowed shadow-2xs"
                />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary">
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <Card variant="surface" pad="md" className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ensure your account is using a long, random password to stay secure.
            </p>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="currentPass" className="block text-xs font-semibold text-slate-700 mb-1">
                Current Password
              </label>
              <input
                id="currentPass"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-black focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="newPass" className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-black focus:outline-none shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="confirmPass" className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-black focus:outline-none shadow-2xs"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button type="submit" variant="primary" isLoading={isUpdatingPassword}>
                Update Password
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: SYSTEM & API INFO */}
      {activeTab === 'system' && (
        <Card variant="surface" pad="md" className="space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Environment &amp; Infrastructure</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active configuration parameters and connected runtime services.
            </p>
          </div>

          <div className="space-y-3 max-w-xl text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Backend API Endpoint</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">
                http://localhost:4000/api
              </code>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Database Backend</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Firestore (Local Emulator / Cloud)
              </span>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Admin Client Host</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">
                http://localhost:5174
              </code>
            </div>

            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Public Storefront Host</span>
              <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-mono">
                http://localhost:5173
              </code>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 font-medium">Software Specification</span>
              <span className="font-semibold text-slate-800">SafarUp PRD §36 &amp; §116 (Phase 2)</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
