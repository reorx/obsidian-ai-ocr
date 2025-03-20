import * as fs from "fs";
import * as path from "path";

import { initMistralOCRClient } from "../ai/mistral";

// For the test to work, you should place test files in the assets directory
// and set your MISTRAL_API_KEY as an environment variable

const ASSETS_DIR = path.join(__dirname, 'assets');

/**
 * Utility function to read a file as blob for testing
 */
async function readFileAsBlob(filePath: string): Promise<Blob> {
    const buffer = fs.readFileSync(filePath);
    return new Blob([buffer], { type: getFileType(filePath) });
}

/**
 * Get the MIME type based on file extension
 */
function getFileType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.pdf':
            return 'application/pdf';
        default:
            return 'application/octet-stream';
    }
}

describe('Mistral OCR Tests', () => {
    const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';

    beforeAll(() => {
        if (!MISTRAL_API_KEY) {
            throw new Error('MISTRAL_API_KEY environment variable is required');
        }
    });

    it('should process all files in assets directory', async () => {
        const files = fs.readdirSync(ASSETS_DIR)
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.pdf'].includes(ext);
            });

        if (files.length === 0) {
            console.warn('⚠️ No test files found in assets directory');
            return;
        }

        // Initialize the OCR client
        const ocrClient = initMistralOCRClient(MISTRAL_API_KEY);

        for (const file of files) {
            const filePath = path.join(ASSETS_DIR, file);
            const fileBlob = await readFileAsBlob(filePath);

            // Process the file with OCR
            const result = await ocrClient.processFile(file, fileBlob);

            // Basic assertions
            expect(result).toBeDefined();
            expect(typeof result.markdownContent).toBe('string');
            expect(result.markdownContent.length).toBeGreaterThan(0);

            // Log results for manual inspection
            console.log(`\n=== Results for ${file} ===`);
            console.log(`Title: ${path.basename(file, path.extname(file))}`);
            console.log(`Text length: ${result.markdownContent.length} characters`);
            console.log('\nText preview:');
            console.log(result.markdownContent.substring(0, 500) + (result.markdownContent.length > 500 ? '...' : ''));

            if (result.images && result.images.length > 0) {
                console.log(`\nTotal images: ${result.images.length}`);
            }
        }
    });
});

/**
 * To run this test:
 * 1. Add test image or PDF files to the assets directory
 * 2. Set your MISTRAL_API_KEY environment variable
 * 3. Run from the command line:
 *    MISTRAL_API_KEY=your_api_key ts-node tests/mistral-ocr.test.ts
 */
