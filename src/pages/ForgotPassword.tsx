import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailIcon, KeyIcon, HomeIcon } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb] relative">
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-[#6b7280] hover:text-[#374151] transition-colors z-10"
      >
        <HomeIcon size={20} />
        <span className="text-sm font-medium">Home</span>
      </Link>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-white border-2 border-[#e5e7eb] rounded-lg flex items-center justify-center">
                <KeyIcon size={20} className="text-[#6b7280]" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-[#374151]">
              Reset your password
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Enter your email and we'll send you a reset link.
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-[#f3f4f6]">
            {error && (
              <div className="mb-4 p-3 bg-red-300/70 border border-red-300 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {success ? (
              <div className="text-center">
                <div className="mb-4 p-3 bg-green-300/70 border border-green-300 rounded-md">
                  <p className="text-sm text-green-700">
                    Check your email for a password reset link.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="text-sm font-medium text-[#374151] hover:text-[#111827] underline"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
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
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6b7280] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9ca3af] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </div>
                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-[#374151] hover:text-[#111827] underline"
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
