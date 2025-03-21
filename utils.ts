import {
	Notice,
	TFile,
	TFolder,
	Vault,
} from "obsidian";
import { OCRResult } from "types";

export const DEBUG = !(process.env.BUILD_ENV === 'production')
if (DEBUG) console.log('DEBUG is enabled')

export function debugLog(...args: any[]) {
	if (DEBUG) {
		console.log((new Date()).toISOString().slice(11, 23), ...args)
	}
}

export const path = {
	// Credit: @creationix/path.js
	join(...partSegments: string[]): string {
		// Split the inputs into a list of path commands.
		let parts: string[] = []
		for (let i = 0, l = partSegments.length; i < l; i++) {
			parts = parts.concat(partSegments[i].split('/'))
		}
		// Interpret the path commands to get the new resolved path.
		const newParts = []
		for (let i = 0, l = parts.length; i < l; i++) {
			const part = parts[i]
			// Remove leading and trailing slashes
			// Also remove "." segments
			if (!part || part === '.') continue
			// Push new path segments.
			else newParts.push(part)
		}
		// Preserve the initial slash if there was one.
		if (parts[0] === '') newParts.unshift('')
		// Turn back into a single string path.
		return newParts.join('/')
	},

	// returns the last part of a path, e.g. 'foo.jpg'
	basename(fullpath: string): string {
		const sp = fullpath.split('/')
		return sp[sp.length - 1]
	},

	// return extension without dot, e.g. 'jpg'
	extension(fullpath: string): string {
		const positions = [...fullpath.matchAll(new RegExp('\\.', 'gi'))].map(a => a.index)
		return fullpath.slice(positions[positions.length - 1] + 1)
	},
}

// ref: https://stackoverflow.com/a/6969486/596206
export function escapeRegExp(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


/**
 * Creates a new markdown file with OCR results
 * @param vault Obsidian vault to create file in
 * @param content The markdown content to save
 * @param suggestedTitle Suggested title for the file
 * @param title Optional user-provided title
 */
export async function createMarkdownFile(vault: Vault, dir: TFolder, title: string, content: string): Promise<TFile> {
	const fileName = sanitizeFilename(title);
	const fileNameAndExt = `${fileName}.md`;
	const preFilePath = path.join(dir.path, fileNameAndExt);

	// Check if file exists and create with unique name if needed
	const filePath = await getUniqueFilePath(vault, preFilePath);

	// Create the file
	console.log(`Creating file: ${filePath}`);
	const file = await vault.create(filePath, content);
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

export interface NameObj {
	name: string
	stem: string
	extension: string
}


export async function deduplicateNewName(vault: Vault, newName: string, dir: string): Promise<NameObj> {
	// list files in dir
	const listed = await vault.adapter.list(dir)
	debugLog('sibling files', listed)

	// parse newName
	const newNameExt = path.extension(newName),
		newNameStem = newName.slice(0, newName.length - newNameExt.length - 1),
		newNameStemEscaped = escapeRegExp(newNameStem),
		delimiter = this.settings.dupNumberDelimiter,
		delimiterEscaped = escapeRegExp(delimiter)

	let dupNameRegex
	if (this.settings.dupNumberAtStart) {
		dupNameRegex = new RegExp(
			`^(?<number>\\d+)${delimiterEscaped}(?<name>${newNameStemEscaped})\\.${newNameExt}$`)
	} else {
		dupNameRegex = new RegExp(
			`^(?<name>${newNameStemEscaped})${delimiterEscaped}(?<number>\\d+)\\.${newNameExt}$`)
	}
	debugLog('dupNameRegex', dupNameRegex)

	const dupNameNumbers: number[] = []
	let isNewNameExist = false
	for (let sibling of listed.files) {
		sibling = path.basename(sibling)
		if (sibling == newName) {
			isNewNameExist = true
			continue
		}

		// match dupNames
		const m = dupNameRegex.exec(sibling)
		if (!m) continue
		// parse int for m.groups.number
		dupNameNumbers.push(parseInt(m.groups.number))
	}

	if (isNewNameExist || this.settings.dupNumberAlways) {
		// get max number
		const newNumber = dupNameNumbers.length > 0 ? Math.max(...dupNameNumbers) + 1 : 1
		// change newName
		if (this.settings.dupNumberAtStart) {
			newName = `${newNumber}${delimiter}${newNameStem}.${newNameExt}`
		} else {
			newName = `${newNameStem}${delimiter}${newNumber}.${newNameExt}`
		}
	}

	return {
		name: newName,
		stem: newName.slice(0, newName.length - newNameExt.length - 1),
		extension: newNameExt,
	}
}


export async function createImagesFromOcrResult(vault: Vault, markdownFile: TFile, ocrResult: OCRResult, dirPath: string): Promise<[string, string][]> {
	const namePathPairs: [string, string][] = [];
	for (const image of ocrResult.images) {
		console.log('creating image', image.name)
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
	return markdown.replace(new RegExp(`!\\[(.*?)\\]\\(${pathBefore}\\)`, 'g'), `![${pathBefore}](${pathAfter})`);
}
