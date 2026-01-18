/**
 * Setup Database
 *
 * Runs migrations and seeds test user for development
 *
 * Usage: npx tsx scripts/setup-db.ts
 */

import { runMigrations } from '@ledesign/db';
import { getDb, queryOne, execute } from '@ledesign/db';
import { hashPassword } from '@ledesign/auth';

const TEST_USER = {
  email: 'test@ledesign.com',
  password: 'test1234',
  name: 'Test User',
  role: 'user',
};

function generateId(): string {
  return `usr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

async function setupDatabase() {
  console.log('🔧 Setting up LeDesign database...\n');

  // Step 1: Run migrations
  console.log('1️⃣  Running migrations...');
  await runMigrations();

  // Step 2: Seed test user
  console.log('\n2️⃣  Creating test user...');

  const db = getDb();

  // Check if user already exists
  const existingUser = await queryOne(
    db,
    'SELECT id, email FROM users WHERE email = ?',
    [TEST_USER.email]
  );

  if (existingUser) {
    console.log(`✓ Test user already exists: ${TEST_USER.email}`);
  } else {
    // Hash password
    const passwordHash = await hashPassword(TEST_USER.password);

    // Create user
    const userId = generateId();
    const now = new Date().toISOString();

    await execute(
      db,
      `INSERT INTO users (id, email, password_hash, name, role, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        TEST_USER.email,
        passwordHash,
        TEST_USER.name,
        TEST_USER.role,
        1, // email_verified
        now,
        now,
      ]
    );

    console.log(`✓ Test user created: ${TEST_USER.email}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ Database setup complete!');
  console.log('='.repeat(50));
  console.log('\nLogin credentials:');
  console.log(`  Email: ${TEST_USER.email}`);
  console.log(`  Password: ${TEST_USER.password}`);
  console.log(`\nDev server: http://localhost:4000`);
  console.log('Sign in: http://localhost:4000/auth/signin');
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error);
    process.exit(1);
  });
