FROM node:20

RUN apt-get update && apt-get install -y \
    curl wget git build-essential fontconfig libxext6 libxrender1 \
    python3 python3-pip \
    ghostscript \
    texlive-xetex texlive-fonts-recommended texlive-plain-generic \
    texlive-latex-extra  && apt-get clean
    
RUN wget https://github.com/jgm/pandoc/releases/download/3.7.0.2/pandoc-3.7.0.2-linux-amd64.tar.gz && \
    tar -xzf pandoc-3.7.0.2-linux-amd64.tar.gz && \
    mv pandoc-3.7.0.2/bin/pandoc /usr/local/bin/ && \
    rm -rf pandoc-3.7.0.2 pandoc-3.7.0.2-linux-amd64.tar.gz
RUN apt-get install -y cmake

RUN npm install -g aws-lambda-ric

ENV LAMBDA_TASK_ROOT=/var/task

# Set working directory
WORKDIR /var/task

# Copy package.json and install dependencies
COPY package.json package-lock.json* .

RUN npm install --legacy-peer-deps

# Copy source code  
COPY . .

ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]

# Set entrypoint for Lambda
CMD ["src/index.handler"]
