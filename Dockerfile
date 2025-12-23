ARG DOCKERFILE_NODE_BASE_IMAGE

FROM ${DOCKERFILE_NODE_BASE_IMAGE} AS production

ENV TZ="UTC"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy pre-built dist from pipeline artifacts
COPY dist ./dist

# Copy node_modules from pipeline cache
COPY node_modules ./node_modules

# Copy environment files
COPY .env* ./

# Install useful debugging tools
RUN apt-get update -y && apt-get install -y \
    tcpdump \
    iputils-ping \
    telnet \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set ownership and switch to non-root user
RUN chown -R 1000:1000 /app

USER 1000

EXPOSE 3232 3235

CMD ["node", "dist/main.js"]
