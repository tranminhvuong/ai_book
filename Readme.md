# Markdown Converter Lambda

This project provides an AWS Lambda function (containerized) that converts Markdown files stored in S3 to various formats (DOCX, PDF, HTML, EPUB) and uploads the converted files back to S3. It also generates pre-signed URLs for easy download.

## Features

- Converts Markdown files to DOCX, PDF, HTML, or EPUB using Pandoc and markdown-pdf.
- Reads source Markdown from S3 and uploads converted files to S3.
- Returns a pre-signed URL for downloading the converted file.
- Supports custom metadata (title, author, etc.) for output documents.
- Containerized for deployment to AWS Lambda using Docker.

## Project Structure

```
.
├── Dockerfile
├── package.json
├── provisioning.sh
└── src/
    ├── index.js
    ├── handlers/
    │   └── lambdaHandler.js
    ├── services/
    │   ├── conversionService.js
    │   └── s3Service.js
    └── utils/
        └── responseUtils.js
```

## Usage

### 1. Build and Deploy

Use the provided [provisioning.sh](provisioning.sh) script to build the Docker image, push it to ECR, and deploy the Lambda function. Make sure you have AWS CLI configured and permissions to create ECR repositories, IAM roles, and Lambda functions.

```sh
bash provisioning.sh
```

### 2. Lambda Event Input

The Lambda function expects an event with the following structure:

```json
{
  "sourceBucket": "your-source-bucket", // optional
  "sourceKey": "path/to/your.md",
  "outputFormat": "pdf", // or "docx", "html", "epub"
  "outputBucket": "your-destination-bucket", // optional
  "outputKey": "output/path/your.pdf", // optional
  "metadata": { // optional
    "title": "Custom Title",
    "author": "Author Name"
  }
}
```

- `sourceBucket` and `sourceKey`: S3 location of the Markdown file.
- `outputFormat`: Desired output format (`docx`, `pdf`, `html`, `epub`).
- `outputBucket` and `outputKey`: S3 location for the converted file.
- `metadata`: (Optional) Metadata for the output document.

### 3. Output

The Lambda returns a JSON response with the S3 location and a pre-signed URL for downloading the converted file.

## Local Development

1. Install dependencies:

   ```sh
   npm install
   ```

2. You can test the conversion services locally by importing and calling the functions in [src/services/conversionService.js](src/services/conversionService.js).

## Environment Variables

- `AWS_REGION`: AWS region (default: `us-east-1`)
- `BUCKET_NAME`: Default S3 bucket for input/output
- `S3_MARKDOWN_KEY`: Default S3 key for input markdown

## Dependencies

- [node-pandoc](https://www.npmjs.com/package/node-pandoc)
- [markdown-pdf](https://www.npmjs.com/package/markdown-pdf)
- [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)
- [@aws-sdk/s3-request-presigner](https://www.npmjs.com/package/@aws-sdk/s3-request-presigner)
- [dotenv](https://www.npmjs.com/package/dotenv)

## License

ISC

---

**Author:**  
See [package.json](package.json)