# Obsidian AI OCR

This is an [Obsidian](https://obsidian.md) plugin that uses Mistral AI's OCR capabilities to convert images and PDFs to markdown with embedded images.

## Features

- Convert images and PDFs to markdown text with embedded images
- Uses [Mistral AI's Document OCR API](https://docs.mistral.ai/capabilities/document/)
- Option to store embedded images as attachments or keep them as base64 data URLs
- Customize attachment folder location
- Auto-generated titles or manually specified titles for new notes

## Installation

### From Obsidian Community Plugins

1. Open Obsidian
2. Go to Settings → Community plugins
3. Turn off "Safe mode"
4. Click "Browse" and search for "AI OCR"
5. Install the plugin
6. Enable the plugin after installation

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/yourusername/obsidian-ai-ocr/releases/latest)
2. Extract the zip file to your Obsidian vault's `.obsidian/plugins` folder
3. Reload Obsidian
4. Enable the plugin in Settings → Community plugins

## Setup

1. Obtain a Mistral AI API key from [https://console.mistral.ai/](https://console.mistral.ai/)
2. In Obsidian, go to Settings → AI OCR
3. Enter your Mistral AI API key
4. Configure other options as desired:
   - Choose whether to save base64 images as attachments
   - Specify the folder for saving extracted images

## Usage

1. Open the command palette (Ctrl+P or Cmd+P)
2. Search for "AI OCR" and select the command
3. In the modal:
   - Optionally enter a title for the new note
   - Click the file selector to choose an image or PDF file
   - Click "Process" to convert the file

## Settings

- **Mistral API Key**: Your API key for accessing Mistral AI's OCR service
- **Save Base64 Images as Attachments**: When enabled, base64 images in the OCR result will be saved as separate files in your vault instead of being embedded directly in the markdown
- **Attachment Folder**: The folder path where extracted images will be saved

## How It Works

The plugin uses Mistral AI's OCR service to extract text and images from your documents. When you select a file, it's sent to the API for processing. The resulting markdown is then saved as a new note in your vault.

The OCR service preserves images in base64 format. Depending on your settings, these can either be kept as data URLs in your markdown or saved as separate files in your attachment folder.

## Privacy & Security

- Your images and PDFs are sent to Mistral AI's API for processing
- Your API key is stored locally in your Obsidian config
- No other data is collected or shared

## License

This project is licensed under the MIT License - see the LICENSE file for details.
