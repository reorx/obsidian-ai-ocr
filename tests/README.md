# AI OCR Tests

This directory contains tests for the AI OCR functionality in the plugin.

## Setup

1. Install test dependencies:
   ```
   npm install
   ```

2. Add test files to the `tests/assets` directory:
   - Images (PNG, JPG, JPEG)
   - PDFs

## Running Tests

### Mistral OCR Test

This test verifies that the Mistral AI OCR functionality works correctly.

1. Set your Mistral AI API key as an environment variable:
   ```
   export MISTRAL_API_KEY=your_api_key_here
   ```

2. Run the test:
   ```
   npm test
   ```

   Or run directly:
   ```
   MISTRAL_API_KEY=your_api_key_here npm test
   ```

## Test Output

The test will:
1. Process all images and PDFs in the `tests/assets` directory
2. Show the extracted text (preview)
3. Count and report the number of pages and images
4. Verify that the OCR process completes successfully

Example output:
```
Testing file: sample.pdf
=== OCR RESULTS ===
Title: Sample Document
Text length: 2345 characters

Extracted text preview:
This is a sample document with some text content...

Total pages: 3
Total images: 2

OCR processing successful!
====================
```

## Adding Your Own Test Files

Place any images or PDFs you want to test in the `tests/assets` directory. The test will automatically process all supported files in that directory.
