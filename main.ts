import {
	App,
	Modal,
	Notice,
	Plugin,
} from "obsidian";

import {
	initMistralOCRClient,
	MistralApiError,
} from "./ai/mistral";
import {
	AiOcrPluginSettings,
	AiOcrSettingTab,
	DEFAULT_SETTINGS,
} from "./settings";
import * as ocrUtils from "./utils";

/**
 * Modal for OCR file processing
 */
export class AiOcrModal extends Modal {
	plugin: AiOcrPlugin;
	titleInput: HTMLInputElement;
	fileInput: HTMLInputElement;
	selectedFile: File | null = null;

	constructor(app: App, plugin: AiOcrPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {contentEl} = this;

		// Add the modal class for styling
		contentEl.addClass('ai-ocr-modal');

		contentEl.createEl('h2', {text: 'Convert Image/PDF to Markdown'});

		// Title input
		contentEl.createEl('label', {text: 'Title for new file (optional):'});
		this.titleInput = contentEl.createEl('input', {
			type: 'text',
			attr: {
				placeholder: 'Leave blank to use auto-generated title'
			}
		});

		contentEl.createEl('br');
		contentEl.createEl('br');

		// File selection
		contentEl.createEl('label', {text: 'Select image or PDF file:'});
		this.fileInput = contentEl.createEl('input', {
			type: 'file',
			attr: {
				accept: 'image/*,.pdf'
			}
		});

		this.fileInput.addEventListener('change', (evt: Event) => {
			const target = evt.target as HTMLInputElement;
			if (target.files && target.files.length > 0) {
				this.selectedFile = target.files[0];
			}
		});

		contentEl.createEl('br');
		contentEl.createEl('br');

		// Button container for layout
		const buttonContainer = contentEl.createDiv({cls: 'button-container'});

		// Process button
		const processButton = buttonContainer.createEl('button', {
			text: 'Process',
			cls: 'mod-cta'
		});

		processButton.addEventListener('click', this.processFile.bind(this));

		// Cancel button
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});

		cancelButton.addEventListener('click', () => {
			this.close();
		});
	}

	async processFile() {
		if (!this.selectedFile) {
			new Notice('Please select a file first.');
			return;
		}

		// Show loading notice
		new Notice('Processing file with Mistral AI OCR...');

		try {
			// Since we are in the browser context, we can't directly access the file path
			// We need to read the file data and send it to the API
			const reader = new FileReader();

			reader.onload = async (e) => {
				try {
					// Check for API key before proceeding
					if (!this.plugin.settings.mistralApiKey) {
						new Notice('Mistral API key not configured. Please set it in plugin settings.');
						return;
					}

					// Create a temporary file path for the API
					const filePath = this.selectedFile?.name || 'upload.file';

					// Get the file as blob for processing
					const fileBlob = new Blob([reader.result as ArrayBuffer], {
						type: this.selectedFile?.type
					});

					// Initialize the OCR client
					const ocrClient = initMistralOCRClient(this.plugin.settings.mistralApiKey);

					// Process the file with OCR
					const ocrResult = await ocrClient.processFile(filePath, fileBlob);

					// Extract markdown content
					const markdownContent = ocrResult.markdownContent;
					const suggestedTitle = this.selectedFile?.name?.replace(/\.[^.]+$/, '') || 'Untitled';

					// Process base64 images based on settings
					const processedContent = await ocrUtils.processBase64Images(
						this.app.vault,
						this.plugin.settings,
						markdownContent,
						ocrUtils.sanitizeFilename(this.titleInput.value || suggestedTitle)
					);

					// Create the markdown file
					const file = await ocrUtils.createMarkdownFile(
						this.app.vault,
						processedContent,
						suggestedTitle,
						this.titleInput.value
					);

					// Open the created file
					this.app.workspace.getLeaf().openFile(file);

					// Close the modal
					this.close();
				} catch (error) {
					console.error('Error processing OCR result:', error);

					// Display appropriate error message based on the type of error
					if (error instanceof MistralApiError) {
						if (error.status) {
							new Notice(`API Error: ${error.status} ${error.statusText}`);
						} else {
							new Notice(error.message);
						}
					} else {
						new Notice('Error processing OCR result. Check console for details.');
					}
				}
			};

			reader.onerror = () => {
				new Notice('Error reading file. Please try again.');
			};

			// Start reading the file
			reader.readAsArrayBuffer(this.selectedFile);
		} catch (error) {
			console.error('Error during OCR processing:', error);
			new Notice('Error processing file. Check console for details.');
		}
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export default class AiOcrPlugin extends Plugin {
	settings: AiOcrPluginSettings;

	async onload() {
		await this.loadSettings();

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
