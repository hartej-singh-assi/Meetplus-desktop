export type RoleLevel = 'EMPLOYEE' | 'MANAGER' | 'HR_ADMIN';

export interface UserPersona {
  email: string;
  id: string;
  name: string;
  title: string;
  role: RoleLevel;
  canApprove: boolean;
  managerName: string;
  avatar: string;
  avatarBg: string;
  department: string;
  joiningDate: string;
  phone: string;
  address: string;
  bankAccount: string;
  pfNumber: string;
  taxId: string;
}

export interface AttendanceRecord {
  date: string;
  status: 'PRESENT' | 'LATE' | 'HALFDAY' | 'ABSENT' | 'LEAVE' | 'HOLIDAY' | 'WEEKEND' | 'UPCOMING';
  clockIn: string;
  clockOut: string;
  hours: number;
  location: string;
  notes?: string;
}

export interface ExpenseClaim {
  id: string;
  category: string;
  date: string;
  amount: number;
  receiptName: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  employeeName: string;
}

export interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  employeeName: string;
  submittedDate: string;
}
