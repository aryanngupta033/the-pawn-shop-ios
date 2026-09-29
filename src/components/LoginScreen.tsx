import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Mail, Lock, User, MapPin, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

import { DevLoginDemoAccounts } from '@dev-logindemo';

interface LoginScreenProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onCancel, onSuccess }) => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, error: authError, clearError, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setLocalError(null);
      clearError();
      await signInWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to initiate Google sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLocalError('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);
      setLocalError(null);
      clearError();

      if (mode === 'signup') {
        if (!fullName.trim()) {
          setLocalError('Please provide your name.');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, fullName, location);
      } else {
        await signInWithEmail(email, password);
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setLocalError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Quick dev test login helper to sign in as Manish or Priya
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string, demoName: string, demoLoc: string) => {
    try {
      setLoading(true);
      setLocalError(null);
      // Try signing in first
      try {
        await signInWithEmail(demoEmail, demoPass);
        if (onSuccess) onSuccess();
        return;
      } catch (e) {
        // If not found, try sign up
        await signUpWithEmail(demoEmail, demoPass, demoName, demoLoc);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setLocalError(`Demo sign-in note: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={onCancel ? "w-full" : "min-h-[80vh] flex items-center justify-center p-4"}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white border border-[#e7e2d9] rounded-2xl shadow-lg p-5 sm:p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full border border-amber-600/30 mx-auto flex items-center justify-center mb-3 bg-stone-900">
            <span className="font-serif text-lg tracking-widest text-amber-300 font-bold">PS</span>
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            {mode === 'signin' ? 'Welcome to The Pawn Shop' : 'Create Collector Account'}
          </h2>
          <p className="text-xs text-stone-500 mt-1 font-sans">
            Curated vintage & collectible marketplace. Peer-to-peer verified.
          </p>
        </div>

        {/* Error Banner */}
        {(localError || authError) && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{localError || authError}</span>
          </div>
        )}

        {/* Primary Action: Google Sign In */}
        <div className="space-y-4">
          <button
            id="google-login-btn"
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-semibold tracking-wide flex items-center justify-center gap-3 transition-colors disabled:opacity-50 border border-stone-800 shadow-xs cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-stone-400">
              <span className="bg-white px-2">or continue with email</span>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="signup-name-input"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Manish Sharma"
                      required
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Location</label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                    <input
                      id="signup-location-input"
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Noida / Ghaziabad, Uttar Pradesh"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-3" />
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-md focus:outline-hidden focus:border-amber-700 bg-stone-50/50"
                />
              </div>
            </div>

            <button
              id="email-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-100 rounded-md text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>{mode === 'signin' ? 'Sign In with Email' : 'Register Account'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setLocalError(null);
                clearError();
              }}
              className="text-xs text-amber-800 hover:text-amber-900 font-medium cursor-pointer"
            >
              {mode === 'signin'
                ? "Don't have an account yet? Register here"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <DevLoginDemoAccounts onLogin={handleQuickDemoLogin} />
        </div>

        {onCancel && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs text-stone-500 hover:text-stone-700 cursor-pointer"
            >
              Browse as Guest
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
