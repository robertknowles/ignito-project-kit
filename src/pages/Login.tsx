import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
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
      navigate('/clients')
    }
  }

  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-white border-2 border-[#e5e7eb] rounded-lg flex items-center justify-center">
                <LockIcon size={20} className="text-[#6b7280]" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-[#374151]">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Or{' '}
              <Link
                to="/signup"
                className="text-[#374151] hover:text-[#111827] font-medium underline"
              >
                create a new account
              </Link>
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-[#f3f4f6]">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[#374151]"
                >
                  Email address
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MailIcon size={16} className="text-[#9ca3af]" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-[#e5e7eb] rounded-md text-sm placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[#374151]"
                >
                  Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockIcon size={16} className="text-[#9ca3af]" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-2 border border-[#e5e7eb] rounded-md text-sm placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] focus:border-transparent"
                    placeholder="••••••••"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#9ca3af] hover:text-[#6b7280] focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOffIcon size={16} />
                      ) : (
                        <EyeIcon size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#6b7280] focus:ring-[#9ca3af] border-[#e5e7eb] rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-[#6b7280]"
                  >
                    Remember me
                  </label>
                </div>
                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-[#374151] hover:text-[#111827] underline"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6b7280] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9ca3af] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}