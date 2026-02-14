import React from 'react'
import { CheckCircleIcon, ArrowLeft } from 'lucide-react'

export function EmailConfirmed() {
  return (
    <div className="main-app flex flex-col h-screen w-full bg-[#f9fafb]">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 border-2 border-green-200 rounded-full flex items-center justify-center">
              <CheckCircleIcon size={40} className="text-green-600" />
            </div>
          </div>
          
          <h2 className="text-2xl font-medium text-[#374151] mb-3">
            Email Verified!
          </h2>
          
          <p className="text-[#6b7280] mb-8">
            Your email has been successfully verified.
          </p>
          
          <div className="bg-white py-8 px-6 shadow-sm rounded-lg border border-[#f3f4f6]">
            <div className="flex items-center justify-center gap-2 text-[#374151] mb-4">
              <ArrowLeft size={20} />
              <span className="font-medium">Return to your original tab</span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Please close this tab and return to the original tab where you signed up to complete your subscription.
            </p>
          </div>
          
          <p className="mt-6 text-xs text-[#9ca3af]">
            You can safely close this tab now.
          </p>
        </div>
      </div>
    </div>
  )
}
