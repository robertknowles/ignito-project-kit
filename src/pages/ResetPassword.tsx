import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LockIcon, EyeIcon, EyeOffIcon, HomeIcon, KeyIcon } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'

export function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [isValidRecovery, setIsValidRecovery] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidRecovery(true)
          setChecking(false)
        }
      }
    )

    // Also check if we already have a session (the event may have fired before mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsValidRecovery(true)
      }
      setChecking(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-lg text-[#6b7280]">Loading...</div>
        </div>
      </div>
    )
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
              Set new password
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Enter your new password below.
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-[#f3f4f6]">
            {!isValidRecovery && !success ? (
              <div className="text-center">
                <div className="mb-4 p-3 bg-red-300/70 border border-red-300 rounded-md">
                  <p className="text-sm text-red-700">
                    This password reset link is invalid or has expired.
                  </p>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#374151] hover:text-[#111827] underline"
                >
                  Request a new reset link
                </Link>
              </div>
            ) : success ? (
              <div className="text-center">
                <div className="mb-4 p-3 bg-green-300/70 border border-green-300 rounded-md">
                  <p className="text-sm text-green-700">
                    Your password has been updated successfully.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="text-sm font-medium text-[#374151] hover:text-[#111827] underline"
                >
                  Sign in with your new password
                </Link>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-300/70 border border-red-300 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-[#374151]"
                    >
                      New password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockIcon size={16} className="text-[#9ca3af]" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
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
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-[#374151]"
                    >
                      Confirm new password
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockIcon size={16} className="text-[#9ca3af]" />
                      </div>
                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-[#e5e7eb] rounded-md text-sm placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#9ca3af] focus:border-transparent"
                        placeholder="••••••••"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="text-[#9ca3af] hover:text-[#6b7280] focus:outline-none"
                        >
                          {showConfirmPassword ? (
                            <EyeOffIcon size={16} />
                          ) : (
                            <EyeIcon size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6b7280] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9ca3af] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Updating...' : 'Update password'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
