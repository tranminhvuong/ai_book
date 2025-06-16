#!/bin/bash

# ----------- CONFIGURATION -----------
AWS_REGION="ap-southeast-1"
PROFILE="dev"
ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)
ECR_REPO_NAME="lambda-convert-container-repo"
IMAGE_TAG="latest"
LAMBDA_FUNCTION_NAME="ConvertMDLambda"
ROLE_NAME="LambdaConvertMDExecutionRole"
CUSTOM_POLICY_NAME="LambdaConvertMDCustomPolicy"
ZIP_FILE="lambda.zip"
BUCKET_NAME="awesome-devops-vn"
# -------------------------------------

set -e  # Exit on error

echo "Creating ECR repository if not exists..."
aws ecr describe-repositories --profile $PROFILE --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1 || \
aws ecr create-repository --profile $PROFILE --repository-name $ECR_REPO_NAME --region $AWS_REGION

echo "Authenticating Docker with ECR..."
aws ecr get-login-password --profile $PROFILE --region $AWS_REGION | docker login \
  --username AWS \
  --password-stdin ${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

ECR_IMAGE="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}:${IMAGE_TAG}"

echo "Building Docker image..."
docker build --platform=linux/amd64 -t ${ECR_IMAGE} .

echo "Pushing image to ECR..."
docker push ${ECR_IMAGE}

IMAGE_DIGEST=$(aws ecr describe-images \
  --profile $PROFILE \
  --repository-name ${ECR_REPO_NAME} \
  --query "imageDetails[?imageTags[0]=='${IMAGE_TAG}'].imageDigest" \
  --output text --region $AWS_REGION)

FULL_IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO_NAME}@${IMAGE_DIGEST}"

echo "Image pushed: $FULL_IMAGE_URI"

echo "Creating IAM role for Lambda..."
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Service": "lambda.amazonaws.com"
    },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --profile $PROFILE \
  --role-name $ROLE_NAME \
  --assume-role-policy-document file://trust-policy.json >/dev/null 2>&1 || echo "Role already exists"

echo "Creating custom policy for Lambda..."
cat > lambda-basic-execution-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:ListObjects"
      ],
      "Resource": "arn:aws:s3:::*"
    }
  ]
}
EOF

aws iam create-policy \
  --profile $PROFILE \
  --policy-name $CUSTOM_POLICY_NAME \
  --policy-document file://lambda-basic-execution-policy.json >/dev/null 2>&1 || echo "Policy already exists"

CUSTOM_POLICY_ARN=$(aws iam list-policies --profile $PROFILE --query "Policies[?PolicyName=='$CUSTOM_POLICY_NAME'].Arn" --output text)

aws iam attach-role-policy \
  --profile $PROFILE \
  --role-name $ROLE_NAME \
  --policy-arn $CUSTOM_POLICY_ARN

ROLE_ARN=$(aws iam get-role --profile $PROFILE --role-name $ROLE_NAME --query 'Role.Arn' --output text)

echo "Creating or updating Lambda function..."
if aws lambda get-function --profile $PROFILE --function-name $LAMBDA_FUNCTION_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "Function exists, updating code..."
    aws lambda update-function-code \
        --profile $PROFILE \
        --function-name $LAMBDA_FUNCTION_NAME \
        --image-uri $FULL_IMAGE_URI \
        --region $AWS_REGION

    sleep 60

    echo "Updating function configuration..."
    aws lambda update-function-configuration \
        --profile $PROFILE \
        --function-name $LAMBDA_FUNCTION_NAME \
        --timeout 900 \
        --memory-size 1024 \
        --environment Variables={BUCKET_NAME=$BUCKET_NAME} \
        --region $AWS_REGION
else
    echo "Creating new function..."
    aws lambda create-function \
        --profile $PROFILE \
        --function-name $LAMBDA_FUNCTION_NAME \
        --package-type Image \
        --code ImageUri=$FULL_IMAGE_URI \
        --role $ROLE_ARN \
        --region $AWS_REGION \
        --timeout 900 \
        --memory-size 512 \
        --environment Variables={BUCKET_NAME=$BUCKET_NAME}
fi

rm lambda-basic-execution-policy.json trust-policy.json
echo "Done. Lambda function '$LAMBDA_FUNCTION_NAME' created with image: $FULL_IMAGE_URI"
