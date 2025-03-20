import {
	App,
	PluginSettingTab,
	Setting,
} from "obsidian";

import AiOcrPlugin from "./main";

export interface AiOcrPluginSettings {
	mistralApiKey: string;
	attachmentFolder: string;
}

export const DEFAULT_SETTINGS: AiOcrPluginSettings = {
	mistralApiKey: '',
	attachmentFolder: 'attachments',
}

export class AiOcrSettingTab extends PluginSettingTab {
	plugin: AiOcrPlugin;

	constructor(app: App, plugin: AiOcrPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.addClass('ai-ocr-settings');

		containerEl.createEl('h2', {text: 'AI OCR Settings'});

		new Setting(containerEl)
			.setName('Mistral API Key')
			.setDesc('API key for Mistral AI OCR service')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.mistralApiKey)
				.onChange(async (value) => {
					this.plugin.settings.mistralApiKey = value;
					await this.plugin.saveSettings();
				}));

		if (!this.plugin.settings.mistralApiKey) {
			containerEl.createEl('div', {
				text: 'You need to set your Mistral API key to use the OCR functionality',
				cls: 'api-key-warning'
			});
		}

		new Setting(containerEl)
			.setName('Attachment Folder')
			.setDesc('Folder path for saving extracted images')
			.addText(text => text
				.setPlaceholder('attachments')
				.setValue(this.plugin.settings.attachmentFolder)
				.onChange(async (value) => {
					this.plugin.settings.attachmentFolder = value;
					await this.plugin.saveSettings();
				}));
	}
}
