import React from 'react'
import { Link } from 'react-router-dom'
import { CheckCircleIcon, HomeIcon } from 'lucide-react'

export function EmailConfirmed() {
  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb] relative">
      {/* Home Button */}
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
              <div className="w-16 h-16 bg-green-100 border-2 border-green-200 rounded-full flex items-center justify-center">
                <CheckCircleIcon size={32} className="text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-medium text-[#374151]">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Your email has been successfully verified. You can now sign in to your account.
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-[#f3f4f6]">
            <div className="text-center">
              <p className="text-sm text-[#6b7280] mb-6">
                Click the button below to sign in and start using PropPath.
              </p>
              <Link
                to="/login"
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#6b7280] hover:bg-[#374151] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#9ca3af]"
              >
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
