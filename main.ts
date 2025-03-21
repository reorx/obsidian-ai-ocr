import {
	App,
	Modal,
	Notice,
	Plugin,
} from "obsidian";
import {
	createImagesFromOcrResult,
	createMarkdownFile,
	replaceImagePath,
	sanitizeFilename,
	suggestTitleFromMarkdown,
} from "utils";

import { initMistralOCRClient } from "./ai/mistral";
import {
	AiOcrPluginSettings,
	AiOcrSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";

/**
 * Modal for OCR file processing
 */

// Define interface for form data
export interface ProcessOptions {
	title: string;
	saveBase64AsAttachment: boolean;
}

export class AiOcrModal extends Modal {
	plugin: AiOcrPlugin;
	form: HTMLFormElement;

	constructor(app: App, plugin: AiOcrPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;

		// Add the modal class for styling
		contentEl.addClass('ai-ocr-modal');

		contentEl.createEl('h2', { text: 'Convert Image/PDF to Markdown' });

		// Create form element
		this.form = contentEl.createEl('form');
		this.form.addEventListener('submit', (e) => {
			e.preventDefault();
			this.handleFormSubmit(e);
		});

		// Title input
		this.form.createEl('label', { text: 'Title for new file (optional):' });
		this.form.createEl('input', {
			type: 'text',
			attr: {
				name: 'title',
				placeholder: 'Leave blank to use auto-generated title'
			}
		});

		this.form.createEl('br');
		this.form.createEl('br');

		// File selection
		this.form.createEl('label', { text: 'Select image or PDF file:' });
		this.form.createEl('input', {
			type: 'file',
			attr: {
				name: 'file',
				accept: 'image/*,.pdf'
			}
		});

		this.form.createEl('br');
		this.form.createEl('br');

		// Save Base64 as attachment option
		const saveBase64Container = this.form.createDiv({ cls: 'setting-item' });
		const saveBase64Label = saveBase64Container.createDiv({ cls: 'setting-item-info' });
		saveBase64Label.createEl('span', { text: 'Save images as attachments', cls: 'setting-item-name' });

		const saveBase64Control = saveBase64Container.createDiv({ cls: 'setting-item-control' });
		saveBase64Control.createEl('input', {
			type: 'checkbox',
			attr: {
				name: 'saveBase64AsAttachment',
				checked: true
			}
		});

		this.form.createEl('br');

		// Button container for layout
		const buttonContainer = this.form.createDiv({ cls: 'button-container' });

		// Process button (submit)
		buttonContainer.createEl('button', {
			text: 'Process',
			cls: 'mod-cta',
			attr: {
				type: 'submit'
			}
		});

		// Cancel button
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel',
			attr: {
				type: 'button'
			}
		});

		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	handleFormSubmit(e: Event) {
		const formData = new FormData(this.form);
		const fileInput = this.form.querySelector('input[type="file"]') as HTMLInputElement;
		const file = fileInput.files?.[0] || null;
		const checkboxInput = this.form.querySelector('input[name="saveBase64AsAttachment"]') as HTMLInputElement;

		const options: ProcessOptions = {
			title: formData.get('title') as string,
			saveBase64AsAttachment: checkboxInput.checked
		};

		this.process(file, options);
	}

	async process(file: File | null, options: ProcessOptions) {
		if (!file) {
			new Notice('Please select a file first.');
			return;
		}

		// Show loading notice
		new Notice('Processing file with Mistral AI OCR...');

		// Since we are in the browser context, we can't directly access the file path
		// We need to read the file data and send it to the API
		const reader = new FileReader();

		reader.onload = async (e) => {
			// try {
				await this.processSelectedFile(reader, file, options);
				// Close the modal
				this.close();
			// } catch (error) {
			// 	console.error('Error processing OCR result:', error);

			// 	// Display appropriate error message based on the type of error
			// 	if (error instanceof MistralApiError) {
			// 		if (error.status) {
			// 			new Notice(`API Error: ${error.status} ${error.statusText}`);
			// 		} else {
			// 			new Notice(error.message);
			// 		}
			// 	} else {
			// 		new Notice('Error processing OCR result. Check console for details.');
			// 	}
			// }
		};

		reader.onerror = () => {
			new Notice('Error reading file. Please try again.');
		};

		try {
			// Start reading the file
			reader.readAsArrayBuffer(file);
		} catch (error) {
			console.error('Error during OCR processing:', error);
			new Notice('Error processing file. Check console for details.');
		}
	}

	async processSelectedFile(reader: FileReader, file: File, options: ProcessOptions) {
		// Check for API key before proceeding
		if (!this.plugin.settings.mistralApiKey) {
			throw new Error('Mistral API key not configured. Please set it in plugin settings.');
		}

		// Create a temporary file path for the API
		const filePath = file.name || 'upload.file';

		// Get the file as blob for processing
		const fileBlob = new Blob([reader.result as ArrayBuffer], {
			type: file.type
		});

		// Initialize the OCR client
		const ocrClient = initMistralOCRClient(this.plugin.settings.mistralApiKey);

		// Process the file with OCR
		const ocrResult = await ocrClient.processFile(filePath, fileBlob);
		console.log('ocrResult', ocrResult);

		// Extract markdown content
		let markdownContent = ocrResult.markdownContent;

		// Try to get a title from the content first, fallback to filename
		const titleFromContent = suggestTitleFromMarkdown(markdownContent);
		const suggestedTitle = titleFromContent || 'OCR Result of ' + sanitizeFilename(file.name);

		// Create the markdown file
		const newFile = await createMarkdownFile(
			this.app.vault,
			this.app.vault.getRoot(),
			suggestedTitle,
			markdownContent,
		);

		// create images
		const imageNamePathPairs = await createImagesFromOcrResult(this.app.vault, newFile, ocrResult, 'attachments');

		// replace images paths in markdown content
		for (const [name, path] of imageNamePathPairs) {
			// use regex to replace ![whatever](name) with ![whatever](path)
			markdownContent = replaceImagePath(markdownContent, name, path);
		}

		// replace markdown content in file
		// TODO

		// Open the created file
		this.app.workspace.getLeaf().openFile(newFile);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export default class AiOcrPlugin extends Plugin {
	settings: AiOcrPluginSettings;

	async onload() {
		await this.loadSettings();

		console.log('AiOcrPlugin loaded');

		// Add ribbon icon for quick access
		this.addRibbonIcon(
			'image-file',
			'AI OCR',
			() => {
				new AiOcrModal(this.app, this).open();
			}
		);

		// Add "AI OCR" command to convert image to markdown
		this.addCommand({
			id: 'ai-ocr-convert',
			name: 'AI OCR',
			callback: () => {
				new AiOcrModal(this.app, this).open();
			}
		});

		// Add a settings tab
		this.addSettingTab(new AiOcrSettingTab(this.app, this));
	}

	onunload() {
		// Nothing to clean up
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
