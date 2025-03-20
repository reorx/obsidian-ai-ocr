import {
	Notice,
	TFile,
	Vault,
} from "obsidian";
import { OCRResult } from "types";

/**
 * Creates a new markdown file with OCR results
 * @param vault Obsidian vault to create file in
 * @param content The markdown content to save
 * @param suggestedTitle Suggested title for the file
 * @param title Optional user-provided title
 */
export async function createMarkdownFile(vault: Vault, title: string, content: string): Promise<TFile> {
	const fileName = sanitizeFilename(title);
	const filePath = `${fileName}.md`;

	// Check if file exists and create with unique name if needed
	const uniqueFilePath = await getUniqueFilePath(vault, filePath);

	// Create the file
	const file = await vault.create(uniqueFilePath, content);
	new Notice(`Created file: ${file.path}`);
	return file;
}

/**
 * Sanitizes a filename by removing invalid characters
 */
export function sanitizeFilename(name: string): string {
	return name.replace(/[\\/:*?"<>|]/g, '-').trim();
}

/**
 * Gets a unique file path if a file with the same name already exists
 */
export async function getUniqueFilePath(vault: Vault, filePath: string): Promise<string> {
	if (!(await vault.adapter.exists(filePath))) {
		return filePath;
	}

	const baseName = filePath.replace(/\.md$/, '');
	let counter = 1;
	let newPath = `${baseName} ${counter}.md`;

	while (await vault.adapter.exists(newPath)) {
		counter++;
		newPath = `${baseName} ${counter}.md`;
	}

	return newPath;
}

export async function createImagesFromOcrResult(vault: Vault, ocrResult: OCRResult, dirPath: string): Promise<[string, string][]> {
	const namePathPairs: [string, string][] = [];
	for (const image of ocrResult.images) {
		if (image.base64_data && image.base64_data.length > 0) {
			const imagePath = `${dirPath}/${image.name}`;
			await createImageFromBase64(vault, imagePath, image.base64_data);
			namePathPairs.push([image.name, imagePath]);
		}
	}
	return namePathPairs;
}

export async function createImageFromBase64(vault: Vault, path: string, base64Data: string) {
	let base64 = base64Data;
	if (base64Data.startsWith('data:')) {
		base64 = base64Data.split(',')[1];
	}
	const file = await vault.createBinary(path, base64ToArrayBuffer(base64));
	return file;
}

/**
 * Converts base64 string to array buffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

/**
 * Extracts title from markdown content by finding the first h1 or h2
 * @param markdown The markdown content to extract title from
 * @returns Suggested title from first h1 or h2, or null if none found
 */
export function suggestTitleFromMarkdown(markdown: string): string | null {
	// Look for heading level 1 (# Title)
	const h1Match = markdown.match(/^#\s+(.+?)(?:\n|$)/m);
	if (h1Match && h1Match[1]) {
		return h1Match[1].trim();
	}

	// If no h1, look for heading level 2 (## Title)
	const h2Match = markdown.match(/^##\s+(.+?)(?:\n|$)/m);
	if (h2Match && h2Match[1]) {
		return h2Match[1].trim();
	}

	return null;
}

export function replaceImagePath(markdown: string, pathBefore: string, pathAfter: string) {
	return markdown.replace(new RegExp(`!\\[.*\\](${pathBefore})`, 'g'), `![${pathBefore}](${pathAfter})`);
}
