import React from 'react';
import {
  Briefcase,
  Home,
  Users,
  TrendingUp,
  DollarSign,
  Gift,
  Tag,
  RefreshCw,
  Hammer,
  CreditCard,
  UserPlus,
  Percent,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import type { EventCategory, EventType } from '../contexts/PropertySelectionContext';

/**
 * Maps event categories to their Lucide icon components
 */
export const EVENT_CATEGORY_ICONS: Record<EventCategory, LucideIcon> = {
  income: Briefcase,
  portfolio: Home,
  life: Users,
  market: TrendingUp,
};

/**
 * Maps event types to their Lucide icon components
 */
export const EVENT_TYPE_ICONS: Record<EventType, LucideIcon> = {
  // Income events
  salary_change: DollarSign,
  partner_income_change: Users,
  bonus_windfall: Gift,
  // Portfolio events
  sell_property: Tag,
  refinance: RefreshCw,
  renovate: Hammer,
  // Life events
  inheritance: Gift,
  major_expense: CreditCard,
  dependent_change: UserPlus,
  // Market events
  interest_rate_change: Percent,
  market_correction: TrendingDown,
};

interface EventCategoryIconProps {
  category: EventCategory;
  size?: number;
  className?: string;
}

/**
 * Renders a Lucide icon for an event category
 */
export const EventCategoryIcon: React.FC<EventCategoryIconProps> = ({
  category,
  size = 20,
  className = 'text-slate-600',
}) => {
  const IconComponent = EVENT_CATEGORY_ICONS[category];
  return <IconComponent size={size} className={className} />;
};

interface EventTypeIconProps {
  eventType: EventType;
  size?: number;
  className?: string;
}

/**
 * Renders a Lucide icon for an event type
 */
export const EventTypeIcon: React.FC<EventTypeIconProps> = ({
  eventType,
  size = 16,
  className = 'text-slate-600',
}) => {
  const IconComponent = EVENT_TYPE_ICONS[eventType];
  return <IconComponent size={size} className={className} />;
};

/**
 * Get the icon component for an event category
 */
export const getEventCategoryIcon = (category: EventCategory): LucideIcon => {
  return EVENT_CATEGORY_ICONS[category];
};

/**
 * Get the icon component for an event type
 */
export const getEventTypeIcon = (eventType: EventType): LucideIcon => {
  return EVENT_TYPE_ICONS[eventType];
};
