import React from 'react';

/**
 * Maps property titles to their corresponding property images
 * Returns the image path based on property type
 */
export const getPropertyTypeImagePath = (propertyTitle: string): string => {
  const normalizedTitle = propertyTitle.toLowerCase();
  
  // Metro Houses
  if (normalizedTitle.includes('metro house')) {
    return '/images/properties/metro-house.png';
  }
  
  // Regional Houses
  if (normalizedTitle.includes('regional') && normalizedTitle.includes('house')) {
    return '/images/properties/regional-house.png';
  }
  
  // Generic Houses (fallback to regional)
  if (normalizedTitle.includes('house')) {
    return '/images/properties/regional-house.png';
  }
  
  // Duplexes
  if (normalizedTitle.includes('duplex')) {
    return '/images/properties/duplex.png';
  }
  
  // Villas / Townhouses
  if (normalizedTitle.includes('villa') || normalizedTitle.includes('townhouse')) {
    return '/images/properties/townhouses.png';
  }
  
  // Units / Apartments
  if (normalizedTitle.includes('unit') || normalizedTitle.includes('apartment')) {
    return '/images/properties/units-apartments.png';
  }
  
  // Small Blocks (3-4 Units)
  if (normalizedTitle.includes('small') && normalizedTitle.includes('block')) {
    return '/images/properties/smaller-blocks-3-4.png';
  }
  
  // Larger Blocks (10-20 Units)
  if (normalizedTitle.includes('larger') && normalizedTitle.includes('block')) {
    return '/images/properties/larger-blocks-10-20.png';
  }
  
  // Commercial properties
  if (normalizedTitle.includes('commercial') || normalizedTitle.includes('retail') || normalizedTitle.includes('office') || normalizedTitle.includes('industrial')) {
    return '/images/properties/commercial-property.png';
  }
  
  // Default fallback to units/apartments
  return '/images/properties/units-apartments.png';
};

/**
 * Maps property titles to their corresponding property images
 * Returns the appropriate image element based on property type
 */
export const getPropertyTypeIcon = (propertyTitle: string, size: number = 16, className: string = 'text-[#6b7280]') => {
  const imagePath = getPropertyTypeImagePath(propertyTitle);
  
  return (
    <img 
      src={imagePath} 
      alt={propertyTitle}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

/**
 * PropertyTypeIcon Component
 * Displays an image for a given property type
 */
interface PropertyTypeIconProps {
  propertyTitle: string;
  size?: number;
  className?: string;
}

export const PropertyTypeIcon: React.FC<PropertyTypeIconProps> = ({ 
  propertyTitle, 
  size = 16, 
  className = '' 
}) => {
  return getPropertyTypeIcon(propertyTitle, size, className);
};

