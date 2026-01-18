import { chromium } from 'playwright';

async function testDashboardLayout() {
  console.log('🚀 Starting Dashboard Layout Test\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Set up mock authentication
    console.log('🔐 Setting up authentication...');
    await context.addCookies([
      {
        name: 'auth_token',
        value: 'mock-token-value-for-testing',
        domain: 'localhost',
        path: '/',
        httpOnly: false
      }
    ]);

    // Add mock data to localStorage
    await page.goto('http://localhost:4000');
    await page.evaluate(() => {
      localStorage.setItem('token', 'mock-token-123');
      localStorage.setItem('user', JSON.stringify({
        id: '1',
        email: 'test@test.com',
        name: 'Test User'
      }));
    });

    // Navigate to dashboard
    console.log('📍 Navigating to dashboard...');
    await page.goto('http://localhost:4000/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait a bit for React to hydrate
    await page.waitForTimeout(3000);

    // Check what's on the page
    const pageContent = await page.content();
    console.log('📄 Page loaded, checking content...\n');

    // Take screenshot to see what's rendered
    await page.screenshot({
      path: '/Users/benjaledesma/Benja/LeDesign/screenshots/initial-load.png',
      fullPage: true
    });

    // Check for redirects or errors
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);

    // Try to find main element
    const mainExists = await page.locator('main').count();
    console.log(`   Main element found: ${mainExists > 0 ? 'YES' : 'NO'}`);

    if (mainExists === 0) {
      // Check what's actually on the page
      const bodyText = await page.locator('body').textContent();
      console.log(`   Body text (first 200 chars): ${bodyText?.substring(0, 200)}`);
      throw new Error('Main element not found - see initial-load.png screenshot');
    }

    await page.waitForSelector('main', { timeout: 5000 });
    console.log('✓ Dashboard loaded\n');

    // Take full page screenshot
    await page.screenshot({
      path: '/Users/benjaledesma/Benja/LeDesign/screenshots/dashboard-full.png',
      fullPage: true
    });
    console.log('📸 Full page screenshot saved\n');

    // === ANALYZE LAYOUT ===
    console.log('═══ LAYOUT ANALYSIS ═══\n');

    const layoutMetrics = await page.evaluate(() => {
      const results = {};

      // Main container
      const main = document.querySelector('main');
      if (main) {
        const mainRect = main.getBoundingClientRect();
        const mainStyles = window.getComputedStyle(main);
        results.main = {
          height: mainRect.height,
          width: mainRect.width,
          computedHeight: mainStyles.height,
          display: mainStyles.display,
          flexDirection: mainStyles.flexDirection
        };
      }

      // Grid container (parent of all three panels)
      const gridContainer = document.querySelector('main > div:last-child');
      if (gridContainer) {
        const rect = gridContainer.getBoundingClientRect();
        const styles = window.getComputedStyle(gridContainer);
        results.gridContainer = {
          height: rect.height,
          width: rect.width,
          flex: styles.flex,
          display: styles.display,
          gap: styles.gap
        };
      }

      // Top row (contains map and list)
      const topRow = document.querySelector('main > div:last-child > div:first-child');
      if (topRow) {
        const rect = topRow.getBoundingClientRect();
        const styles = window.getComputedStyle(topRow);
        results.topRow = {
          height: rect.height,
          width: rect.width,
          flex: styles.flex,
          display: styles.display,
          gridTemplateColumns: styles.gridTemplateColumns,
          gap: styles.gap
        };
      }

      // Map wrapper and component
      const mapWrapper = document.querySelector('main > div:last-child > div:first-child > div:first-child');
      const mapComponent = mapWrapper?.querySelector('div');
      if (mapWrapper && mapComponent) {
        const wrapperRect = mapWrapper.getBoundingClientRect();
        const componentRect = mapComponent.getBoundingClientRect();
        results.map = {
          wrapper: {
            height: wrapperRect.height,
            width: wrapperRect.width
          },
          component: {
            height: componentRect.height,
            width: componentRect.width
          },
          heightMatch: Math.abs(wrapperRect.height - componentRect.height) < 2,
          widthMatch: Math.abs(wrapperRect.width - componentRect.width) < 2
        };
      }

      // List wrapper and component
      const listWrapper = document.querySelector('main > div:last-child > div:first-child > div:last-child');
      const listComponent = listWrapper?.querySelector('div');
      if (listWrapper && listComponent) {
        const wrapperRect = listWrapper.getBoundingClientRect();
        const componentRect = listComponent.getBoundingClientRect();
        results.list = {
          wrapper: {
            height: wrapperRect.height,
            width: wrapperRect.width
          },
          component: {
            height: componentRect.height,
            width: componentRect.width
          },
          heightMatch: Math.abs(wrapperRect.height - componentRect.height) < 2,
          widthMatch: Math.abs(wrapperRect.width - componentRect.width) < 2
        };
      }

      // Quick Access wrapper and component
      const qaWrapper = document.querySelector('main > div:last-child > div:last-child');
      const qaComponent = qaWrapper?.querySelector('div');
      const qaGrid = qaComponent?.querySelector('div:last-child');
      const qaCards = qaGrid?.querySelectorAll('button');

      if (qaWrapper && qaComponent && qaGrid) {
        const wrapperRect = qaWrapper.getBoundingClientRect();
        const componentRect = qaComponent.getBoundingClientRect();
        const gridRect = qaGrid.getBoundingClientRect();

        const cardHeights = [];
        qaCards?.forEach(card => {
          cardHeights.push(card.getBoundingClientRect().height);
        });

        results.quickAccess = {
          wrapper: {
            height: wrapperRect.height,
            width: wrapperRect.width
          },
          component: {
            height: componentRect.height,
            width: componentRect.width
          },
          grid: {
            height: gridRect.height,
            width: gridRect.width
          },
          cards: {
            count: qaCards?.length || 0,
            heights: cardHeights,
            avgHeight: cardHeights.length ? cardHeights.reduce((a, b) => a + b, 0) / cardHeights.length : 0
          },
          heightMatch: Math.abs(wrapperRect.height - componentRect.height) < 2,
          widthMatch: Math.abs(wrapperRect.width - componentRect.width) < 2,
          gridFitsInComponent: gridRect.height <= componentRect.height + 2
        };
      }

      // Check if top row and bottom row have equal heights
      const bottomRow = document.querySelector('main > div:last-child > div:last-child');
      if (topRow && bottomRow) {
        const topHeight = topRow.getBoundingClientRect().height;
        const bottomHeight = bottomRow.getBoundingClientRect().height;
        results.rowHeightComparison = {
          topHeight,
          bottomHeight,
          difference: Math.abs(topHeight - bottomHeight),
          areEqual: Math.abs(topHeight - bottomHeight) < 5
        };
      }

      return results;
    });

    // Print results
    console.log('📊 Main Container:');
    console.log(`   Size: ${layoutMetrics.main.width}px × ${layoutMetrics.main.height}px`);
    console.log(`   Display: ${layoutMetrics.main.display} (${layoutMetrics.main.flexDirection})`);
    console.log();

    console.log('📦 Grid Container:');
    console.log(`   Size: ${layoutMetrics.gridContainer.width}px × ${layoutMetrics.gridContainer.height}px`);
    console.log(`   Flex: ${layoutMetrics.gridContainer.flex}`);
    console.log(`   Gap: ${layoutMetrics.gridContainer.gap}`);
    console.log();

    console.log('🔝 Top Row (Map + List):');
    console.log(`   Size: ${layoutMetrics.topRow.width}px × ${layoutMetrics.topRow.height}px`);
    console.log(`   Columns: ${layoutMetrics.topRow.gridTemplateColumns}`);
    console.log();

    console.log('🗺️  Projects Map:');
    console.log(`   Wrapper: ${layoutMetrics.map.wrapper.width}px × ${layoutMetrics.map.wrapper.height}px`);
    console.log(`   Component: ${layoutMetrics.map.component.width}px × ${layoutMetrics.map.component.height}px`);
    console.log(`   ✓ Fills container: ${layoutMetrics.map.heightMatch && layoutMetrics.map.widthMatch ? 'YES ✅' : 'NO ❌'}`);
    console.log();

    console.log('📋 Projects List:');
    console.log(`   Wrapper: ${layoutMetrics.list.wrapper.width}px × ${layoutMetrics.list.wrapper.height}px`);
    console.log(`   Component: ${layoutMetrics.list.component.width}px × ${layoutMetrics.list.component.height}px`);
    console.log(`   ✓ Fills container: ${layoutMetrics.list.heightMatch && layoutMetrics.list.widthMatch ? 'YES ✅' : 'NO ❌'}`);
    console.log();

    console.log('🎯 Quick Access Panel:');
    console.log(`   Wrapper: ${layoutMetrics.quickAccess.wrapper.width}px × ${layoutMetrics.quickAccess.wrapper.height}px`);
    console.log(`   Component: ${layoutMetrics.quickAccess.component.width}px × ${layoutMetrics.quickAccess.component.height}px`);
    console.log(`   Grid: ${layoutMetrics.quickAccess.grid.width}px × ${layoutMetrics.quickAccess.grid.height}px`);
    console.log(`   Cards: ${layoutMetrics.quickAccess.cards.count} cards (avg height: ${layoutMetrics.quickAccess.cards.avgHeight.toFixed(1)}px)`);
    console.log(`   ✓ Fills container: ${layoutMetrics.quickAccess.heightMatch && layoutMetrics.quickAccess.widthMatch ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   ✓ Grid fits inside: ${layoutMetrics.quickAccess.gridFitsInComponent ? 'YES ✅' : 'NO ❌'}`);
    console.log();

    console.log('⚖️  Row Height Balance:');
    console.log(`   Top row: ${layoutMetrics.rowHeightComparison.topHeight.toFixed(1)}px`);
    console.log(`   Bottom row: ${layoutMetrics.rowHeightComparison.bottomHeight.toFixed(1)}px`);
    console.log(`   Difference: ${layoutMetrics.rowHeightComparison.difference.toFixed(1)}px`);
    console.log(`   ✓ Equal split: ${layoutMetrics.rowHeightComparison.areEqual ? 'YES ✅' : 'NO ❌'}`);
    console.log();

    // Take component screenshots
    console.log('📸 Taking component screenshots...\n');

    const mapElement = await page.locator('main > div:last-child > div:first-child > div:first-child').first();
    await mapElement.screenshot({ path: '/Users/benjaledesma/Benja/LeDesign/screenshots/map-component.png' });

    const listElement = await page.locator('main > div:last-child > div:first-child > div:last-child').first();
    await listElement.screenshot({ path: '/Users/benjaledesma/Benja/LeDesign/screenshots/list-component.png' });

    const qaElement = await page.locator('main > div:last-child > div:last-child').first();
    await qaElement.screenshot({ path: '/Users/benjaledesma/Benja/LeDesign/screenshots/quickaccess-component.png' });

    console.log('✅ All screenshots saved to /screenshots/\n');

    // VALIDATION SUMMARY
    console.log('═══ VALIDATION SUMMARY ═══\n');

    const issues = [];

    if (!layoutMetrics.map.heightMatch || !layoutMetrics.map.widthMatch) {
      issues.push('❌ Map component does not fill its container properly');
    }

    if (!layoutMetrics.list.heightMatch || !layoutMetrics.list.widthMatch) {
      issues.push('❌ List component does not fill its container properly');
    }

    if (!layoutMetrics.quickAccess.heightMatch || !layoutMetrics.quickAccess.widthMatch) {
      issues.push('❌ Quick Access component does not fill its container properly');
    }

    if (!layoutMetrics.quickAccess.gridFitsInComponent) {
      issues.push('❌ Quick Access grid overflows its container');
    }

    if (!layoutMetrics.rowHeightComparison.areEqual) {
      issues.push(`⚠️  Row heights are not equal (diff: ${layoutMetrics.rowHeightComparison.difference.toFixed(1)}px)`);
    }

    if (issues.length === 0) {
      console.log('✅ All layout checks passed! The dashboard layout is correct.\n');
    } else {
      console.log('⚠️  Layout issues found:\n');
      issues.forEach(issue => console.log(`   ${issue}`));
      console.log();
    }

  } catch (error) {
    console.error('❌ Error during test:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboardLayout().catch(console.error);
