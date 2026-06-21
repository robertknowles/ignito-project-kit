import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { track, EVENTS } from '@/lib/analytics'

export function SignUp() {
  const navigate = useNavigate()
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Use to create an account')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const { error: signUpError } = await signUp(email, password, name)

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
    } else {
      localStorage.setItem('ignito_is_new_user', 'true')
      track(EVENTS.signedUp)
      setSuccess(true)
      setLoading(false)
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
          Create your account
        </h1>
        <p className="text-center text-base text-[#667085] mb-8">
          Start your free trial today.
        </p>

        <div className="flex p-1 mb-8 bg-[#F9FAFB] border border-[#EAECF0] rounded-[10px]">
          <div className="flex-1 py-2 text-center text-sm font-semibold text-[#344054] bg-white rounded-md shadow-sm">
            Sign up
          </div>
          <Link
            to="/login"
            className="flex-1 py-2 text-center text-sm font-semibold text-[#667085] rounded-md hover:text-[#344054] transition-colors"
          >
            Log in
          </Link>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-lg">
            <p className="text-sm text-[#B42318]">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-5 p-3 bg-[#ECFDF3] border border-[#ABEFC6] rounded-lg">
            <p className="text-sm text-[#067647]">
              Account created successfully! Please check your email to verify your account.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[#344054] mb-1.5"
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-3.5 py-2.5 border border-[#D0D5DD] rounded-lg text-base text-[#101828] placeholder-[#667085] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-[#7F56D9]"
            />
          </div>

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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-[#344054] mb-1.5"
            >
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-3.5 py-2.5 pr-10 border border-[#D0D5DD] rounded-lg text-base text-[#101828] placeholder-[#667085] shadow-xs focus:outline-none focus:ring-2 focus:ring-[#7F56D9] focus:border-[#7F56D9]"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#344054] focus:outline-none"
              >
                {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded border-[#D0D5DD] text-[#7F56D9] focus:ring-[#7F56D9]"
            />
            <span className="text-sm text-[#667085]">
              I confirm I hold the appropriate real estate licence for the services I provide, and I agree to the{' '}
              <Link to="/terms" className="text-[#6941C6] hover:text-[#53389E] underline" target="_blank">
                Terms of Use
              </Link>
              . I understand PropPath is a modelling tool and does not provide financial product advice or credit assistance.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 bg-[#7F56D9] hover:bg-[#6941C6] text-white text-base font-semibold rounded-lg shadow-xs border border-[#7F56D9] focus:outline-none focus:ring-4 focus:ring-[#F4EBFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating account...' : success ? 'Account created!' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#667085]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#6941C6] hover:text-[#53389E]"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}