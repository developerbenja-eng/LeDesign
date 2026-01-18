/**
 * Test Login Flow
 *
 * Tests the authentication API programmatically
 *
 * Usage: npx tsx scripts/test-login.ts
 */

const API_URL = 'http://localhost:4000';

const TEST_CREDENTIALS = {
  email: 'test@ledesign.com',
  password: 'test1234',
};

async function testLogin() {
  console.log('🧪 Testing Login Flow\n');
  console.log('─'.repeat(50));

  try {
    // Step 1: Test login
    console.log('\n1️⃣  Testing POST /api/auth/login...');
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${errorData.error || loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('   ✓ Login successful');
    console.log(`   ✓ Received token: ${loginData.token.substring(0, 20)}...`);
    console.log(`   ✓ User: ${loginData.user.email} (${loginData.user.name})`);

    const token = loginData.token;

    // Step 2: Test fetching current user
    console.log('\n2️⃣  Testing GET /api/auth/me...');
    const meResponse = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!meResponse.ok) {
      const errorData = await meResponse.json();
      throw new Error(`Get current user failed: ${errorData.error || meResponse.statusText}`);
    }

    const meData = await meResponse.json();
    console.log('   ✓ Current user fetched successfully');
    console.log(`   ✓ User ID: ${meData.user.id}`);
    console.log(`   ✓ Email: ${meData.user.email}`);
    console.log(`   ✓ Name: ${meData.user.name}`);
    console.log(`   ✓ Role: ${meData.user.role}`);

    // Step 3: Test fetching projects
    console.log('\n3️⃣  Testing GET /api/projects...');
    const projectsResponse = await fetch(`${API_URL}/api/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!projectsResponse.ok) {
      const errorData = await projectsResponse.json();
      throw new Error(`Get projects failed: ${errorData.error || projectsResponse.statusText}`);
    }

    const projectsData = await projectsResponse.json();
    console.log('   ✓ Projects fetched successfully');
    console.log(`   ✓ Projects count: ${projectsData.projects?.length || 0}`);

    // Step 4: Test fetching structural projects
    console.log('\n4️⃣  Testing GET /api/structural/projects...');
    const structuralProjectsResponse = await fetch(`${API_URL}/api/structural/projects`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!structuralProjectsResponse.ok) {
      const errorData = await structuralProjectsResponse.json();
      throw new Error(`Get structural projects failed: ${errorData.error || structuralProjectsResponse.statusText}`);
    }

    const structuralProjectsData = await structuralProjectsResponse.json();
    console.log('   ✓ Structural projects fetched successfully');
    console.log(`   ✓ Structural projects count: ${structuralProjectsData.length || 0}`);

    console.log('\n' + '─'.repeat(50));
    console.log('✅ All tests passed!\n');
    console.log('You can now log in to the UI:');
    console.log(`   URL: ${API_URL}/auth/signin`);
    console.log(`   Email: ${TEST_CREDENTIALS.email}`);
    console.log(`   Password: ${TEST_CREDENTIALS.password}`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testLogin()
  .then(() => {
    console.log('\n✓ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Unexpected error:', error);
    process.exit(1);
  });
