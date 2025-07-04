const { spawn } = require('child_process');
const fs = require('fs');

// Function to convert markdown to DOCX
async function convertMarkdownToDocx(markdown, outputPath, coverImagePath) {
  return new Promise((resolve, reject) => {
    let markdownWithCover = '';
    if (coverImagePath) {
      markdownWithCover = `![](${coverImagePath})\n\n\\newpage\n\n` + markdown;
    } else {
      markdownWithCover = markdown;
    }
    const tmpInputPath = '/tmp/input-docx.md';
    fs.writeFileSync(tmpInputPath, markdownWithCover);
    const args = [
      '-f', 'markdown',
      '-t', 'docx',
      '-o', outputPath,
      '--highlight-style=tango',
      '--standalone',
      '--self-contained',
      '--reference-doc=reference.docx',
      tmpInputPath
    ];
    const pandoc = spawn('pandoc', args);
    pandoc.on('error', (err) => {
      console.error('Pandoc DOCX conversion error:', err);
      reject(err);
    });
    pandoc.on('close', (code) => {
      fs.unlinkSync(tmpInputPath);
      if (code !== 0) {
        reject(new Error(`Pandoc exited with code ${code}`));
      } else {
        try {
          if (!fs.existsSync(outputPath)) {
            throw new Error(`Output file not found: ${outputPath}`);
          }
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        } catch (error) {
          console.error('Error reading DOCX file:', error);
          reject(error);
        }
      }
    });
  });
}

// Function to wait for file to exist
async function waitForFile(filePath, maxRetries = 10, interval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    console.log(`Waiting for file ${filePath} to be generated... (attempt ${i + 1}/${maxRetries})`);
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return false;
}

// Function to convert markdown to PDF
async function convertMarkdownToPdf(markdown, outputPath, metadata = {}, coverImagePath) {
  return new Promise((resolve, reject) => {
    // Default metadata
    const defaultMetadata = {
      title: 'Converted Document',
      author: 'Markdown Converter',
      date: new Date().toISOString()
    };

    // Merge provided metadata with defaults
    const finalMetadata = { ...defaultMetadata, ...metadata };

    // Construct metadata arguments
    const metadataArgs = [
      `--metadata title='${finalMetadata.title}'`,
      `--metadata author='${finalMetadata.author}'`,
      `--metadata date='${finalMetadata.date}'`
    ].join(' ');

    console.log('PDF conversion metadata:', finalMetadata);
    console.log('PDF conversion output path:', outputPath);

    let markdownWithCover = '';
    if (coverImagePath) {
      markdownWithCover = `![](${coverImagePath})\n\n` + markdown;
    } else {
      markdownWithCover = markdown;
    }
    
    const tmpInputPath = '/tmp/input-pdf.md';
    fs.writeFileSync(tmpInputPath, markdownWithCover);
    const args = [
      '-f', 'markdown',
      '-t', 'pdf',
      '--pdf-engine=xelatex',
      '-o', outputPath,
      '--highlight-style=tango',
      '--standalone',
      tmpInputPath
    ];
    const pandoc = spawn('pandoc', args);
    pandoc.on('error', (err) => {
      console.error('Pandoc DOCX conversion error:', err);
      reject(err);
    });
    pandoc.on('close', (code) => {
      fs.unlinkSync(tmpInputPath);
      if (code !== 0) {
        reject(new Error(`Pandoc exited with code ${code}`));
      } else {
        try {
          if (!fs.existsSync(outputPath)) {
            throw new Error(`Output file not found: ${outputPath}`);
          }
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        } catch (error) {
          console.error('Error reading PDF file:', error);
          reject(error);
        }
      }
    });
  });
}

// Function to convert markdown to HTML
async function convertMarkdownToHtml(markdown, outputPath, metadata = {}, coverImagePath) {
  return new Promise((resolve, reject) => {
    try {
      const defaultMetadata = {
        title: 'Converted Document',
        author: 'Markdown Converter',
        date: new Date().toISOString(),
        css: 'https://cdn.jsdelivr.net/npm/water.css@2/out/water.css'
      };
      const finalMetadata = { ...defaultMetadata, ...metadata };
      const metadataArgs = [
        `--metadata=title:${finalMetadata.title}`,
        `--metadata=author:${finalMetadata.author}`,
        `--metadata=date:${finalMetadata.date}`,
        `--css=${finalMetadata.css}`
      ];
      const tmpInputPath = '/tmp/input-html.md';
      let markdownWithCover = '';
      if (coverImagePath) {
        markdownWithCover = `![](${coverImagePath})\n\n\\newpage\n\n` + markdown;
      } else {
        markdownWithCover = markdown;
      }
      fs.writeFileSync(tmpInputPath, markdownWithCover);
      const args = [
        '-f', 'markdown',
        '-t', 'html',
        '--highlight-style=tango',
        '--self-contained',
        '--standalone',
        coverImagePath ? `--epub-cover-image=${coverImagePath}` : '',
        '-o', outputPath,
        ...metadataArgs,
        tmpInputPath
      ];
      const pandoc = spawn('pandoc', args);
      pandoc.on('error', (err) => {
        console.error('Pandoc HTML conversion error:', err);
        reject(err);
      });
      pandoc.on('close', async (code) => {
        fs.unlinkSync(tmpInputPath);
        if (code !== 0) {
          reject(new Error(`Pandoc exited with code ${code}`));
        } else {
          try {
            const fileExists = await waitForFile(outputPath);
            if (!fileExists) {
              throw new Error(`Output file not found after waiting: ${outputPath}`);
            }
            const buffer = fs.readFileSync(outputPath);
            fs.unlinkSync(outputPath);
            resolve(buffer);
          } catch (error) {
            console.error('Error reading HTML file:', error);
            reject(error);
          }
        }
      });
    } catch (error) {
      console.error('Error in HTML conversion:', error);
      reject(new Error(`HTML conversion failed: ${error.message}`));
    }
  });
}

// Function to convert markdown to EPUB
async function convertMarkdownToEpub(markdown, outputPath, metadata = {}, coverImagePath) {
  return new Promise((resolve, reject) => {
    try {
      const defaultMetadata = {
        title: 'Document',
        author: 'Author',
        language: 'en'
      };
      const finalMetadata = { ...defaultMetadata, ...metadata };
      const metadataArgs = [
        `--metadata=title:${finalMetadata.title}`,
        `--metadata=author:${finalMetadata.author}`
      ];
      const tmpInputPath = '/tmp/input-epub.md';
      fs.writeFileSync(tmpInputPath, markdown);
      const args = [
        '-f', 'markdown',
        '-t', 'epub2',
        ...metadataArgs,
        '--highlight-style=tango',
        '--standalone',
        coverImagePath ? `--epub-cover-image=${coverImagePath}` : '',
        '-o', outputPath,
        tmpInputPath
      ];
      console.log('EPUB conversion metadata:', args);
      
      const pandoc = spawn('pandoc', args);
      pandoc.on('error', (err) => {
        console.error('Pandoc EPUB conversion error:', err);
        reject(new Error(`EPUB conversion failed: ${err.message}`));
      });
      pandoc.on('close', () => {
        fs.unlinkSync(tmpInputPath);
        try {
          if (!fs.existsSync(outputPath)) {
            throw new Error(`Output file not found: ${outputPath}`);
          }
          const buffer = fs.readFileSync(outputPath);
          fs.unlinkSync(outputPath);
          resolve(buffer);
        } catch (error) {
          console.error('Error reading EPUB file:', error);
          reject(error);
        }
      });
    } catch (error) {
      console.error('Error in EPUB conversion:', error);
      reject(new Error(`EPUB conversion failed: ${error.message}`));
    }
  });
}

module.exports = {
  convertMarkdownToDocx,
  convertMarkdownToPdf,
  convertMarkdownToHtml,
  convertMarkdownToEpub
}; 