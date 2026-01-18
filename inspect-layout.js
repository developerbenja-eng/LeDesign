const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Navigate to dashboard
    await page.goto('http://localhost:4000/dashboard', { waitUntil: 'networkidle' });

    // Wait for main content to load
    await page.waitForSelector('main', { timeout: 10000 });

    console.log('\n=== LAYOUT INSPECTION ===\n');

    // Get main container dimensions
    const mainDimensions = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return null;
      const rect = main.getBoundingClientRect();
      const styles = window.getComputedStyle(main);
      return {
        height: rect.height,
        width: rect.width,
        display: styles.display,
        flexDirection: styles.flexDirection,
        gap: styles.gap
      };
    });
    console.log('Main container:', mainDimensions);

    // Get grid container dimensions
    const gridDimensions = await page.evaluate(() => {
      const grid = document.querySelector('main > div:last-child');
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const styles = window.getComputedStyle(grid);
      return {
        height: rect.height,
        width: rect.width,
        display: styles.display,
        flexDirection: styles.flexDirection,
        gap: styles.gap,
        flex: styles.flex
      };
    });
    console.log('Grid container:', gridDimensions);

    // Get top row (2 columns) dimensions
    const topRowDimensions = await page.evaluate(() => {
      const topRow = document.querySelector('main > div:last-child > div:first-child');
      if (!topRow) return null;
      const rect = topRow.getBoundingClientRect();
      const styles = window.getComputedStyle(topRow);
      return {
        height: rect.height,
        width: rect.width,
        display: styles.display,
        gridTemplateColumns: styles.gridTemplateColumns,
        gap: styles.gap,
        flex: styles.flex
      };
    });
    console.log('Top row (2 columns):', topRowDimensions);

    // Get Projects Map dimensions
    const mapDimensions = await page.evaluate(() => {
      const mapContainer = document.querySelector('main > div:last-child > div:first-child > div:first-child');
      if (!mapContainer) return null;
      const rect = mapContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(mapContainer);

      // Also check the actual map component
      const mapComponent = mapContainer.querySelector('div');
      const mapRect = mapComponent ? mapComponent.getBoundingClientRect() : null;

      return {
        container: {
          height: rect.height,
          width: rect.width,
          display: styles.display,
          minHeight: styles.minHeight
        },
        map: mapRect ? {
          height: mapRect.height,
          width: mapRect.width
        } : null
      };
    });
    console.log('Projects Map:', mapDimensions);

    // Get Projects List dimensions
    const listDimensions = await page.evaluate(() => {
      const listContainer = document.querySelector('main > div:last-child > div:first-child > div:last-child');
      if (!listContainer) return null;
      const rect = listContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(listContainer);

      // Also check the actual list component
      const listComponent = listContainer.querySelector('div');
      const listRect = listComponent ? listComponent.getBoundingClientRect() : null;

      return {
        container: {
          height: rect.height,
          width: rect.width,
          display: styles.display,
          minHeight: styles.minHeight
        },
        list: listRect ? {
          height: listRect.height,
          width: listRect.width
        } : null
      };
    });
    console.log('Projects List:', listDimensions);

    // Get Quick Access Panel dimensions
    const quickAccessDimensions = await page.evaluate(() => {
      const qaContainer = document.querySelector('main > div:last-child > div:last-child');
      if (!qaContainer) return null;
      const rect = qaContainer.getBoundingClientRect();
      const styles = window.getComputedStyle(qaContainer);

      // Also check the actual panel component
      const qaComponent = qaContainer.querySelector('div');
      const qaRect = qaComponent ? qaComponent.getBoundingClientRect() : null;

      // Check the grid inside
      const grid = qaComponent ? qaComponent.querySelector('div:last-child') : null;
      const gridRect = grid ? grid.getBoundingClientRect() : null;
      const gridStyles = grid ? window.getComputedStyle(grid) : null;

      return {
        container: {
          height: rect.height,
          width: rect.width,
          display: styles.display,
          flex: styles.flex,
          minHeight: styles.minHeight
        },
        panel: qaRect ? {
          height: qaRect.height,
          width: qaRect.width
        } : null,
        grid: gridRect && gridStyles ? {
          height: gridRect.height,
          width: gridRect.width,
          display: gridStyles.display,
          gridTemplateColumns: gridStyles.gridTemplateColumns,
          gap: gridStyles.gap
        } : null
      };
    });
    console.log('Quick Access Panel:', quickAccessDimensions);

    // Check if elements are overflowing
    const overflowCheck = await page.evaluate(() => {
      const results = [];
      const containers = [
        { name: 'Map Container', selector: 'main > div:last-child > div:first-child > div:first-child' },
        { name: 'List Container', selector: 'main > div:last-child > div:first-child > div:last-child' },
        { name: 'Quick Access Container', selector: 'main > div:last-child > div:last-child' }
      ];

      containers.forEach(({ name, selector }) => {
        const container = document.querySelector(selector);
        if (container) {
          const child = container.querySelector('div');
          if (child) {
            const containerRect = container.getBoundingClientRect();
            const childRect = child.getBoundingClientRect();
            results.push({
              name,
              isOverflowing: childRect.height > containerRect.height || childRect.width > containerRect.width,
              containerHeight: containerRect.height,
              childHeight: childRect.height,
              heightDiff: childRect.height - containerRect.height
            });
          }
        }
      });

      return results;
    });
    console.log('\n=== OVERFLOW CHECK ===');
    overflowCheck.forEach(result => {
      console.log(`${result.name}:`);
      console.log(`  Container: ${result.containerHeight}px`);
      console.log(`  Child: ${result.childHeight}px`);
      console.log(`  Overflow: ${result.isOverflowing ? 'YES' : 'NO'} (${result.heightDiff > 0 ? '+' : ''}${result.heightDiff.toFixed(2)}px)`);
    });

    // Take screenshot
    await page.screenshot({ path: '/Users/benjaledesma/Benja/LeDesign/dashboard-layout.png', fullPage: true });
    console.log('\n✓ Screenshot saved to dashboard-layout.png');

    // Keep browser open for manual inspection
    console.log('\n=== Browser kept open for manual inspection ===');
    console.log('Press Ctrl+C to close when done.\n');

    await new Promise(() => {}); // Keep running

  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Don't close browser automatically
  }
})();
