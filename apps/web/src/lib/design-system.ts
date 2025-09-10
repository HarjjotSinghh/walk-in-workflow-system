// Unified Design System Constants for Dashboard
// This file centralizes all design patterns to ensure consistency across dashboard pages

export const designSystem = {
  // Layout
  layout: {
    background: "min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50",
    container: "space-y-8",
    maxWidth: "mx-auto max-w-7xl",
  },

  // Cards
  card: {
    base: "border-0 bg-card/80 backdrop-blur-sm transition-all duration-150",
    elevated: "border-0 bg-card/90 backdrop-blur-sm transition-all duration-150",
    nested: "border-0 bg-card/50 transition-all duration-150",
    gradient: "border-0 bg-gradient-to-r from-white via-green-50 to-white transition-all duration-150",
  },

  // Buttons
  button: {
    primary: "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition-all duration-150",
    secondary: "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-all duration-150",
    destructive: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white transition-all duration-150",
  },

  // Badges
  badge: {
    connection: {
      connected: "bg-emerald-100 text-emerald-800 border-emerald-200",
      disconnected: "bg-red-100 text-red-800 border-red-200",
    },
    status: {
      new: "bg-green-100 text-green-800 border-green-200",
      approved: "bg-yellow-100 text-yellow-800 border-yellow-200",
      inSession: "bg-emerald-100 text-emerald-800 border-emerald-200",
      completed: "bg-gray-100 text-gray-800 border-gray-200",
      denied: "bg-red-100 text-red-800 border-red-200",
      active: "bg-emerald-100 text-emerald-800 border-emerald-200",
      inactive: "bg-red-100 text-red-800 border-red-200",
      available: "bg-emerald-100 text-emerald-800 border-emerald-200",
      busy: "bg-red-100 text-red-800 border-red-200",
    },
    role: "bg-green-100 text-green-800 border-green-200",
    count: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },

  // Typography
  typography: {
    pageTitle: "text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent",
    pageSubtitle: "text-gray-600 mt-2",
    cardTitle: "flex items-center gap-3 text-xl",
    sectionTitle: "text-sm font-medium text-gray-500 uppercase tracking-wider",
  },

  // Icons in Cards
  iconContainer: {
    primary: "p-2 bg-green-100 rounded-lg",
    secondary: "p-2 bg-emerald-100 rounded-lg",
    warning: "p-2 bg-yellow-100 rounded-lg",
    neutral: "p-2 bg-gray-100 rounded-lg",
  },

  // Stats Cards
  statsCard: {
    base: "border-0 transition-all duration-150",
    green: "bg-gradient-to-br from-green-50 to-green-100",
    emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    yellow: "bg-gradient-to-br from-yellow-50 to-yellow-100",
    gray: "bg-gradient-to-br from-gray-50 to-gray-100",
  },

  // Forms
  form: {
    input: "h-12 border-gray-200 focus:border-green-500 focus:ring-green-500 transition-colors",
    textarea: "border-gray-200 focus:border-green-500 focus:ring-green-500 transition-colors",
    select: "h-12 border-gray-200 focus:border-green-500 focus:ring-green-500",
    label: "text-sm font-medium text-gray-700",
  },

  // Loading
  loading: {
    skeleton: "bg-gray-200 rounded animate-pulse",
    spinner: "animate-spin rounded-full h-5 w-5 border-b-2 border-white",
    card: "bg-card rounded-xl p-6 animate-pulse border border-border",
  },

  // Animations
  animation: {
    transition: "transition-all duration-150",
    hover: "hover:scale-[1.02] transition-transform duration-150",
  },
} as const;

// Helper function to get status color
export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'new': return designSystem.badge.status.new;
    case 'approved': return designSystem.badge.status.approved;
    case 'in-session': return designSystem.badge.status.inSession;
    case 'completed': return designSystem.badge.status.completed;
    case 'denied': return designSystem.badge.status.denied;
    case 'active': return designSystem.badge.status.active;
    case 'inactive': return designSystem.badge.status.inactive;
    case 'available': return designSystem.badge.status.available;
    case 'busy': return designSystem.badge.status.busy;
    default: return designSystem.badge.status.completed;
  }
}

// Helper function to get connection status class
export function getConnectionBadgeClass(connected: boolean): string {
  return connected 
    ? designSystem.badge.connection.connected 
    : designSystem.badge.connection.disconnected;
}