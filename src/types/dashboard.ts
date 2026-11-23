export interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  walletBalance: number;
  lastLoginDate: string;
}

export interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  total: string;
  detail?: string;
}

export interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail?: string;
  change?: string;
  isPositive?: boolean;
}

export interface PeriodDropdownProps {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  className?: string;
}
