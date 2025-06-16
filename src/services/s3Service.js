const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const crypto = require('crypto');

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Function to read markdown from S3
async function readMarkdownFromS3(bucketName, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const response = await s3Client.send(command);
    const markdown = await response.Body.transformToString();
    return markdown;
  } catch (error) {
    console.error('Error reading from S3:', error);
    throw error;
  }
}

async function readImageFromS3(bucketName, key) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    const response = await s3Client.send(command);

    // Đọc dữ liệu binary từ response.Body
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const imageBuffer = Buffer.concat(chunks);

    const md5 = crypto.createHash('md5').update(imageBuffer).digest('hex');
    const imagePath = `/tmp/${md5}.png`;
    fs.writeFileSync(imagePath, imageBuffer);

    return imagePath;
  } catch (error) {
    console.error('Error reading from S3:', error);
    throw error;
  }
}

// Function to upload file to S3
async function uploadToS3(bucketName, key, fileBuffer, contentType) {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType
    });
    
    await s3Client.send(command);
    return `s3://${bucketName}/${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

// Function to generate pre-signed URL
async function generatePresignedUrl(bucketName, key, expiresIn = 3600) {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
}

module.exports = {
  readMarkdownFromS3,
  uploadToS3,
  generatePresignedUrl,
  readImageFromS3
};
