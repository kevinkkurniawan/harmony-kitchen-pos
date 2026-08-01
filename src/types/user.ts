export interface POSUser {
  id: string;
  username: string;
  name: string;
  shift: 'pagi' | 'siang' | 'malam';
}

export const MOCK_POS_USERS: POSUser[] = [
  { id: '1', username: 'lia', name: 'Lia Kasir', shift: 'pagi' },
  { id: '2', username: 'linda', name: 'Linda Kasir', shift: 'siang' },
  { id: '3', username: 'sulis', name: 'Sulis Kasir', shift: 'malam' },
];
