import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export function Login() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
    } else {
      localStorage.removeItem('pending_subscription_plan')
      navigate('/dashboard')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-[360px]">
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img
              src="/images/proppath-icon.png"
              alt="PropPath"
              className="w-10 h-10 rounded-lg"
            />
          </Link>
        </div>

        <h1 className="text-center text-[30px] font-semibold tracking-tight text-[#101828] mb-3">
          Log in to your account
        </h1>
        <p className="text-center text-base text-[#667085] mb-8">
          Welcome back! Please enter your details.
        </p>

        <div className="flex p-1 mb-8 bg-[#F9FAFB] border border-[#EAECF0] rounded-[10px]">
          <Link
            to="/signup"
            className="flex-1 py-2 text-center text-sm font-semibold text-[#667085] rounded-md hover:text-[#344054] transition-colors"
          >
            Sign up
          </Link>
          <div className="flex-1 py-2 text-center text-sm font-semibold text-[#344054] bg-white rounded-md shadow-sm">
            Log in
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-lg">
            <p className="text-sm text-[#B42318]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#344054] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-3.5 py-2.5 border border-[#D0D5DD] rounded-lg text-base text-[#101828] placeholder-[#667085] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-[#7F56D9]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#344054] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 border border-[#D0D5DD] rounded-lg text-base text-[#101828] placeholder-[#667085] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-[#7F56D9]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#344054] focus:outline-none"
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#D0D5DD] text-[#7F56D9] focus:ring-[#7F56D9]"
              />
              <span className="text-sm text-[#344054]">Remember for 30 days</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm font-semibold text-[#6941C6] hover:text-[#53389E]"
            >
              Forgot password
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-base font-semibold rounded-lg shadow-xs border border-[#7F56D9] focus:outline-none focus:ring-4 focus:ring-[#F4EBFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#667085]">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-[#6941C6] hover:text-[#53389E]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}