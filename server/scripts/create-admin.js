/**
 * One-time script to create an admin user.
 * Run from server directory: node scripts/create-admin.js
 * Set ADMIN_USERNAME and ADMIN_PASSWORD env vars, or defaults (admin / admin123) are used.
 */

const path = require('path');
const fs = require('fs');
const PouchDB = require('pouchdb');
const bcrypt = require('bcryptjs');

const dbPath = path.join(process.cwd(), 'data');
fs.mkdirSync(dbPath, { recursive: true });

const usersDb = new PouchDB(path.join(dbPath, 'users'));
const SALT_ROUNDS = 10;

const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
const password = process.env.ADMIN_PASSWORD || 'admin123';
const displayName = process.env.ADMIN_DISPLAY_NAME || 'Admin';

const id = `user_${username}`;

async function main() {
  if (password.length < 6) {
    console.error('Password must be at least 6 characters (or set ADMIN_PASSWORD).');
    process.exit(1);
  }

  try {
    let doc;
    try {
      doc = await usersDb.get(id);
      doc.role = 'admin';
      doc.displayName = displayName;
      if (process.env.ADMIN_PASSWORD) {
        doc.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      }
      await usersDb.put(doc);
      console.log(`Updated existing user "${username}" to role: admin.`);
    } catch (err) {
      if (err.status !== 404) throw err;
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      doc = {
        _id: id,
        type: 'user',
        username,
        passwordHash,
        displayName,
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      await usersDb.put(doc);
      console.log(`Created admin user: ${username}`);
    }
    console.log(`  Username: ${username}`);
    console.log(`  Password: (set via ADMIN_PASSWORD or default used)`);
    console.log('You can log in at the app with this account.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
