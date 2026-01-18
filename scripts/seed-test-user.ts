/**
 * Seed Test User
 *
 * Creates a test user for development and testing purposes.
 *
 * Usage: npx tsx scripts/seed-test-user.ts
 */

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

async function seedTestUser() {
  console.log('Creating test user...\n');

  const db = getDb();

  // Check if user already exists
  const existingUser = await queryOne(
    db,
    'SELECT id, email FROM users WHERE email = ?',
    [TEST_USER.email]
  );

  if (existingUser) {
    console.log(`✓ Test user already exists: ${TEST_USER.email}`);
    console.log(`  ID: ${existingUser.id}`);
    console.log('\nYou can log in with:');
    console.log(`  Email: ${TEST_USER.email}`);
    console.log(`  Password: ${TEST_USER.password}`);
    return;
  }

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

  console.log('✓ Test user created successfully!\n');
  console.log('Login credentials:');
  console.log(`  Email: ${TEST_USER.email}`);
  console.log(`  Password: ${TEST_USER.password}`);
  console.log(`  User ID: ${userId}`);
  console.log('\nYou can now log in at: http://localhost:4000/auth/signin');
}

// Run the seed
seedTestUser()
  .then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Error:', error);
    process.exit(1);
  });
