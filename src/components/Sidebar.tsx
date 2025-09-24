import React from 'react';
import { BarChart3Icon, FolderIcon, HomeIcon, LayoutDashboardIcon } from 'lucide-react';
export const Sidebar = () => {
  return <div className="w-16 h-full bg-white border-r border-[#f0f1f2] flex flex-col items-center py-8 gap-8">
      <div className="w-8 h-8 bg-[#3b82f6] bg-opacity-90 rounded-md flex items-center justify-center">
        <FolderIcon className="text-white" size={16} />
      </div>
      <div className="flex flex-col gap-6">
        <div className="w-8 h-8 bg-[#edf2fd] rounded-md flex items-center justify-center text-[#3b82f6]">
          <HomeIcon size={16} />
        </div>
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-[#9ca3af] hover:text-[#3b82f6] transition-colors">
          <BarChart3Icon size={16} />
        </div>
        <div className="w-8 h-8 rounded-md flex items-center justify-center text-[#9ca3af] hover:text-[#3b82f6] transition-colors">
          <LayoutDashboardIcon size={16} />
        </div>
      </div>
    </div>;
};