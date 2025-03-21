import { Vault } from "obsidian";

import {
	describe,
	expect,
	it,
	jest,
} from "@jest/globals";

import {
	createImageFromBase64,
	replaceImagePath,
} from "../utils";

// Mock the Obsidian types we need
jest.mock('obsidian', () => {
    return {
        // Any Obsidian types can be mocked here if needed
    };
}, { virtual: true });

describe('Utils Tests', () => {
    describe('createImageFromBase64', () => {
        it('should create a binary file from base64 data', async () => {
            // Mock file object
            const mockFile = {} as never;

            // Mock the Vault with createBinary function
            const mockVault = {
                createBinary: jest.fn().mockResolvedValue(mockFile)
            } as unknown as Vault;

            // data url
            const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

            // Call the function with mocked vault
            const result = await createImageFromBase64(mockVault, 'attachments/test.png', base64Data);

            // Verify the vault.createBinary was called with the right parameters
            expect(mockVault.createBinary).toHaveBeenCalledTimes(1);
            expect(mockVault.createBinary).toHaveBeenCalledWith(
                'attachments/test.png',
                expect.any(ArrayBuffer)
            );

            // Verify the result is as expected
            expect(result).toBe(mockFile);
        });

        it('should handle base64 data with data URL prefix', async () => {
            // Mock file object
            const mockFile = {} as never;

            // Mock the Vault with createBinary function
            const mockVault = {
                createBinary: jest.fn().mockResolvedValue(mockFile)
            } as unknown as Vault;

            // Base64 with data URL prefix
            const base64Data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

            // Call the function with mocked vault
            const result = await createImageFromBase64(mockVault, 'attachments/test.png', base64Data);

            // Verify the vault.createBinary was called with the right parameters
            expect(mockVault.createBinary).toHaveBeenCalledTimes(1);
            expect(mockVault.createBinary).toHaveBeenCalledWith(
                'attachments/test.png',
                expect.any(ArrayBuffer)
            );

            // Verify the result is as expected
            expect(result).toBe(mockFile);
        });
    });

    describe('replaceImagePath', () => {
        it('should replace image paths in markdown', () => {
            const markdown = 'This is a test ![image](old_path.png) with an image';
            const result = replaceImagePath(markdown, 'old_path.png', 'foo/bar/new_path.png');
            expect(result).toBe('This is a test ![old_path.png](foo/bar/new_path.png) with an image');
        });

        it('should replace multiple instances of the same image path', () => {
            const markdown = 'Image 1: ![alt text](image.png) and Image 2: ![another alt](image.png)';
            const result = replaceImagePath(markdown, 'image.png', 'new/path/image.png');
            expect(result).toBe('Image 1: ![image.png](new/path/image.png) and Image 2: ![image.png](new/path/image.png)');
        });

        it('should not replace text that is not an image markdown syntax', () => {
            const markdown = 'This is text with (path.png) but not an image';
            const result = replaceImagePath(markdown, 'path.png', 'new.png');
            expect(result).toBe('This is text with (path.png) but not an image');
        });

        it('should handle empty alt text', () => {
            const markdown = 'Empty alt: ![](image.png)';
            const result = replaceImagePath(markdown, 'image.png', 'new/image.png');
            expect(result).toBe('Empty alt: ![image.png](new/image.png)');
        });
    });
});
