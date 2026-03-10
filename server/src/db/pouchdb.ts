import PouchDB from 'pouchdb';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data');
fs.mkdirSync(dbPath, { recursive: true });

export const usersDb = new PouchDB(path.join(dbPath, 'users'));
export const booksDb = new PouchDB(path.join(dbPath, 'books'));
export const borrowingsDb = new PouchDB(path.join(dbPath, 'borrowings'));

export interface UserDoc {
  _id: string;
  _rev?: string;
  type: 'user';
  username: string;
  passwordHash: string;
  displayName: string;
  role: 'admin' | 'librarian' | 'member';
  createdAt: string;
}

export interface BookDoc {
  _id: string;
  _rev?: string;
  type: 'book';
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

export interface BorrowingDoc {
  _id: string;
  _rev?: string;
  type: 'borrowing';
  bookId: string;
  userId: string;
  borrowedAt: string;
  dueDate: string;
  returnedAt?: string;
  status: 'active' | 'returned';
}
