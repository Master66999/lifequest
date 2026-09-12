'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Sparkles, AlertCircle, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Registration error. Try another email.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#090d16] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <img
              src="/logo.png"
              alt="LifeQuest AI Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-xs border border-slate-200 group-hover:scale-105 transition-transform"
            />
            <span className="font-extrabold text-base tracking-tight text-[#090d16]">
              LifeQuest <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">PRO</span>
            </span>
          </Link>
          <h1 className="text-xl font-extrabold tracking-tight text-[#090d16]">Create Character</h1>
          <p className="text-xs text-slate-700 font-medium mt-0.5">Initialize your productivity dossier</p>
        </div>

        {/* Card */}
        <div className="card p-6 bg-white border border-slate-300 shadow-md">
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="reg-email" className="block font-bold text-slate-800 mb-1">
                Email Address
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warrior@realm.com"
                required
                className="input text-slate-900 font-medium"
              />
            </div>

            <div>
              <label htmlFor="reg-password" className="block font-bold text-slate-800 mb-1">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pr-9 text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="block font-bold text-slate-800 mb-1">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="input text-slate-900 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full py-2.5 text-xs font-bold mt-1 shadow-sm shadow-blue-500/20"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-700 font-medium mt-5">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-700 hover:underline font-bold ml-1">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
