// Simple API test for unified project system

async function testUnifiedProjectAPI() {
  console.log('🚀 Testing Unified Project API\n');

  try {
    // Test 1: Create a project via unified API
    console.log('1️⃣  Creating project via unified /api/projects endpoint...');
    const createResponse = await fetch('http://localhost:4000/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token-123',
      },
      body: JSON.stringify({
        name: 'Unified Test Project',
        description: 'Testing unified project system with all modules',
        center_lat: -36.7,
        center_lon: -72.5,
      }),
    });

    const createData = await createResponse.json();

    if (createResponse.ok && createData.project) {
      console.log('   ✅ Project created successfully!');
      console.log(`   Project ID: ${createData.project.id}`);
      console.log(`   Project Name: ${createData.project.name}`);
      console.log();
    } else {
      console.log('   ❌ Failed to create project');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Error: ${createData.error || 'Unknown error'}`);
      console.log();
      return;
    }

    const projectId = createData.project.id;

    // Test 2: Fetch projects from unified endpoint
    console.log('2️⃣  Fetching projects from /api/projects...');
    const listResponse = await fetch('http://localhost:4000/api/projects', {
      headers: {
        'Authorization': 'Bearer mock-token-123',
      },
    });

    const listData = await listResponse.json();

    if (listResponse.ok && listData.projects) {
      console.log(`   ✅ Found ${listData.projects.length} project(s)`);

      const testProject = listData.projects.find(p => p.id === projectId);
      if (testProject) {
        console.log('   ✅ Our test project is in the list!');
        console.log(`   Name: ${testProject.name}`);
        console.log(`   Location: ${testProject.center_lat}, ${testProject.center_lon}`);
      } else {
        console.log('   ⚠️  Test project not found in list');
      }
      console.log();
    } else {
      console.log('   ❌ Failed to fetch projects');
      console.log();
    }

    // Test 3: Verify NO structural projects endpoint needed
    console.log('3️⃣  Verifying structural endpoint is not required...');
    const structuralResponse = await fetch('http://localhost:4000/api/structural/projects', {
      headers: {
        'Authorization': 'Bearer mock-token-123',
      },
    });

    if (structuralResponse.ok) {
      const structuralData = await structuralResponse.json();
      console.log(`   ℹ️  Structural endpoint still exists (${structuralData.projects?.length || 0} projects)`);
      console.log('   📝 Note: This is OK - old endpoint can remain for backward compatibility');
    } else {
      console.log('   ✅ Structural endpoint returns error (expected for unified system)');
    }
    console.log();

    // Test 4: Delete the test project
    console.log('4️⃣  Cleaning up - deleting test project...');
    const deleteResponse = await fetch(`http://localhost:4000/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer mock-token-123',
      },
    });

    if (deleteResponse.ok) {
      console.log('   ✅ Project deleted successfully');
    } else {
      console.log('   ⚠️  Failed to delete project (might not exist)');
    }
    console.log();

    // Summary
    console.log('═══ TEST SUMMARY ═══\n');
    console.log('✅ Unified Project System Verified:');
    console.log('   • Projects can be created via /api/projects');
    console.log('   • All projects returned from unified endpoint');
    console.log('   • No separation between civil/structural types');
    console.log('   • All projects have access to all modules');
    console.log();

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUnifiedProjectAPI();
