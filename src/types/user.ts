export interface POSUser {
  id: string;
  username: string;
  name: string;
  role: 'Cashier' | 'Supervisor' | 'Manager';
  password?: string;
  shift?: 'pagi' | 'siang' | 'malam';
}

export const MOCK_POS_USERS: POSUser[] = [
  { id: 'demo', username: 'demo', name: 'Kasir Demo', role: 'Cashier', password: 'demo', shift: 'pagi' },
  { id: '1', username: 'lia', name: 'Lia Kasir', role: 'Cashier', password: '123', shift: 'pagi' },
  { id: '2', username: 'linda', name: 'Linda Kasir', role: 'Cashier', password: '123', shift: 'siang' },
  { id: '3', username: 'sulis', name: 'Sulis Supervisor', role: 'Supervisor', password: '1234', shift: 'malam' },
];
