/**
 * LeCoin Certificate Download Utilities
 * Converts certificate HTML to downloadable image or PDF
 */

/**
 * Downloads the certificate as a PNG image
 * Uses html2canvas to render the certificate element
 */
export async function downloadCertificateAsPNG(
  coinNumber: number,
  supporterName: string
): Promise<void> {
  try {
    // Dynamically import html2canvas (only when needed)
    const html2canvas = (await import('html2canvas')).default;

    // Find the certificate element
    const element = document.getElementById(`lecoin-certificate-${coinNumber}`);
    if (!element) {
      throw new Error('Certificate element not found');
    }

    // Render to canvas with high quality
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution (2x)
      backgroundColor: '#0f172a', // slate-900
      logging: false,
      useCORS: true,
    });

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create image blob');
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const fileName = `LeCoin-${coinNumber}-${supporterName.replace(/\s+/g, '-')}-Certificate.png`;

      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Error downloading certificate:', error);
    throw new Error('Failed to download certificate. Please try again.');
  }
}

/**
 * Opens the certificate in a new window for printing
 * This allows users to print to PDF using their browser
 */
export function printCertificate(coinNumber: number): void {
  try {
    const element = document.getElementById(`lecoin-certificate-${coinNumber}`);
    if (!element) {
      throw new Error('Certificate element not found');
    }

    // Create a new window with just the certificate
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }

    // Write certificate HTML to new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LeCoin Certificate #${coinNumber}</title>
          <style>
            @page {
              size: letter;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  } catch (error) {
    console.error('Error printing certificate:', error);
    throw new Error('Failed to print certificate. Please try again.');
  }
}

/**
 * Generates a shareable certificate image URL (for social media)
 * Returns a data URL that can be shared
 */
export async function generateCertificateDataURL(coinNumber: number): Promise<string> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    const element = document.getElementById(`lecoin-certificate-${coinNumber}`);
    if (!element) {
      throw new Error('Certificate element not found');
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0f172a',
      logging: false,
      useCORS: true,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating certificate data URL:', error);
    throw new Error('Failed to generate certificate image');
  }
}
