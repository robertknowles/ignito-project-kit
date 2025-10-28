import React from 'react';
import { 
  Building2, 
  Home, 
  Building, 
  Warehouse, 
  Store, 
  Briefcase,
  Castle
} from 'lucide-react';

/**
 * Maps property titles to their corresponding Lucide React icons
 * Returns the appropriate icon component based on property type
 */
export const getPropertyTypeIcon = (propertyTitle: string, size: number = 16, className: string = 'text-[#6b7280]') => {
  const normalizedTitle = propertyTitle.toLowerCase();
  
  // Houses
  if (normalizedTitle.includes('metro houses') || normalizedTitle.includes('metro house')) {
    return <Home size={size} className={className} />;
  }
  
  if (normalizedTitle.includes('house')) {
    return <Home size={size} className={className} />;
  }
  
  // Duplexes
  if (normalizedTitle.includes('duplex')) {
    return <Building2 size={size} className={className} />;
  }
  
  // Villas / Townhouses
  if (normalizedTitle.includes('villa') || normalizedTitle.includes('townhouse')) {
    return <Castle size={size} className={className} />;
  }
  
  // Units / Apartments
  if (normalizedTitle.includes('unit') || normalizedTitle.includes('apartment')) {
    return <Building size={size} className={className} />;
  }
  
  // Granny Flats
  if (normalizedTitle.includes('granny flat')) {
    return <Home size={size} className={className} />;
  }
  
  // Commercial properties
  if (normalizedTitle.includes('commercial') || normalizedTitle.includes('retail')) {
    return <Store size={size} className={className} />;
  }
  
  if (normalizedTitle.includes('office')) {
    return <Briefcase size={size} className={className} />;
  }
  
  if (normalizedTitle.includes('industrial')) {
    return <Warehouse size={size} className={className} />;
  }
  
  // Default fallback
  return <Building size={size} className={className} />;
};

/**
 * PropertyTypeIcon Component
 * Displays an icon for a given property type
 */
interface PropertyTypeIconProps {
  propertyTitle: string;
  size?: number;
  className?: string;
}

export const PropertyTypeIcon: React.FC<PropertyTypeIconProps> = ({ 
  propertyTitle, 
  size = 16, 
  className = 'text-[#6b7280]' 
}) => {
  return getPropertyTypeIcon(propertyTitle, size, className);
};

