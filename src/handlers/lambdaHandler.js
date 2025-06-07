require('dotenv').config();
const { readMarkdownFromS3, uploadToS3, generatePresignedUrl } = require('../services/s3Service');
const {
  convertMarkdownToDocx,
  convertMarkdownToPdf,
  convertMarkdownToHtml,
  convertMarkdownToEpub
} = require('../services/conversionService');
const { createSuccessResponse, createErrorResponse } = require('../utils/responseUtils');

// Lambda handler function
exports.handler = async (event) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Extract parameters from event
    const {
      sourceBucket = process.env.BUCKET_NAME,
      sourceKey = process.env.S3_MARKDOWN_KEY,
      outputFormat = 'docx',
      outputBucket = process.env.BUCKET_NAME,
      outputKey = `output/${outputFormat}/${sourceKey.split('/').pop().split('.')[0]}.${outputFormat}`,
      metadata = {}
    } = event;

    // Validate required parameters
    if (!sourceBucket || !sourceKey) {
      throw new Error('Missing required parameters: sourceBucket and sourceKey');
    }

    // Read markdown from S3
    console.log(`Reading markdown from s3://${sourceBucket}/${sourceKey}`);
    const markdown = await readMarkdownFromS3(sourceBucket, sourceKey);

    // Extract title from markdown if not provided in metadata
    if (!metadata.title) {
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        metadata.title = titleMatch[1];
      }
    }

    // Convert based on specified format
    console.log(`Converting markdown to ${outputFormat.toUpperCase()}...`);
    let convertedContent;
    let contentType;

    switch (outputFormat.toLowerCase()) {
      case 'pdf':
        convertedContent = await convertMarkdownToPdf(markdown, '/tmp/output.pdf', metadata);
        contentType = 'application/pdf';
        break;
      case 'html':
        convertedContent = await convertMarkdownToHtml(markdown, '/tmp/output.html', metadata);
        contentType = 'text/html';
        break;
      case 'epub':
        convertedContent = await convertMarkdownToEpub(markdown, '/tmp/output.epub', metadata);
        contentType = 'application/epub+zip';
        break;
      case 'docx':
      default:
        convertedContent = await convertMarkdownToDocx(markdown, '/tmp/output.docx');
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        break;
    }

    // Upload converted file to S3
    if (outputBucket) {
      console.log(`Uploading converted file to s3://${outputBucket}/${outputKey}`);
      await uploadToS3(outputBucket, outputKey, convertedContent, contentType);
      
      // Generate pre-signed URL
      const downloadUrl = await generatePresignedUrl(outputBucket, outputKey);

      return createSuccessResponse({
        outputLocation: `s3://${outputBucket}/${outputKey}`,
        downloadUrl: downloadUrl,
        format: outputFormat,
        contentType: contentType,
        expiresIn: '1 hour'
      });
    }

    return createSuccessResponse({
      outputLocation: 'local',
      format: outputFormat,
      contentType: contentType
    });

  } catch (error) {
    console.error('Error:', error);
    return createErrorResponse(error);
  }
}; 