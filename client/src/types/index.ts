export interface User {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'librarian' | 'member';
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  genre: string;
  year: number;
  quantity: number;
  available: number;
  createdAt: string;
  updatedAt: string;
}

export interface Borrowing {
  id: string;
  bookId: string;
  userId: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'active' | 'returned';
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
