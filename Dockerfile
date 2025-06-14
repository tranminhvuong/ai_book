FROM public.ecr.aws/lambda/nodejs:18-x86_64

# Install dependencies for pandoc (if needed)
RUN apt-get update -y || echo "No apt-get available, using yum"
RUN yum install -y tar bzip2 gzip wget tar xz xz-utils fontconfig


# Install Pandoc
RUN wget https://github.com/jgm/pandoc/releases/download/3.7.0.2/pandoc-3.7.0.2-linux-amd64.tar.gz && \
    tar -xzf pandoc-3.7.0.2-linux-amd64.tar.gz && \
    mv pandoc-3.7.0.2/bin/pandoc /usr/local/bin/ && \
    rm -rf pandoc-3.7.0.2 pandoc-3.7.0.2-linux-amd64.tar.gz


# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT} 

RUN yum install -y librsvg texlive latex 

# Copy package.json and install dependencies
COPY package.json package-lock.json* ./

RUN npm install --legacy-peer-deps

# Copy source code  
COPY . .

# Set entrypoint for Lambda
CMD ["src/index.handler"]