import {
	Notice,
	TFile,
	Vault,
} from "obsidian";

import { AiOcrPluginSettings } from "./settings";

/**
 * Creates a new markdown file with OCR results
 * @param vault Obsidian vault to create file in
 * @param content The markdown content to save
 * @param suggestedTitle Suggested title for the file
 * @param title Optional user-provided title
 */
export async function createMarkdownFile(vault: Vault, content: string, suggestedTitle: string, title?: string): Promise<TFile> {
	const fileName = sanitizeFilename(title || suggestedTitle);
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

/**
 * Processes base64 images in markdown content
 * @param vault Obsidian vault to save images to
 * @param settings Plugin settings
 * @param content Markdown content with base64 images
 * @param baseName Base name for image files
 * @returns Processed markdown content
 */
export async function processBase64Images(
	vault: Vault,
	settings: AiOcrPluginSettings,
	content: string,
	baseName: string
): Promise<string> {
	if (!settings.saveBase64AsAttachment) {
		return content; // Keep base64 data URLs as is
	}

	let processedContent = content;
	const base64Regex = /!\[.*?\]\(data:image\/[a-zA-Z]+;base64,([^)]+)\)/g;
	let match;
	let counter = 0;

	const attachmentFolderPath = settings.attachmentFolder;

	// Ensure the attachment folder exists
	if (!(await vault.adapter.exists(attachmentFolderPath))) {
		await vault.createFolder(attachmentFolderPath);
	}

	while ((match = base64Regex.exec(content)) !== null) {
		const fullMatch = match[0];
		const base64Data = match[1];

		// Create image from base64
		const imageData = base64ToArrayBuffer(base64Data);
		const imageName = `${baseName}-image-${counter}.png`;
		const imagePath = `${attachmentFolderPath}/${imageName}`;

		await vault.createBinary(imagePath, imageData);

		// Replace base64 data URL with reference to saved image
		processedContent = processedContent.replace(
			fullMatch,
			`![](${imagePath})`
		);

		counter++;
	}

	return processedContent;
}

/**
 * Converts base64 string to array buffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binaryString = window.atob(base64);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}
