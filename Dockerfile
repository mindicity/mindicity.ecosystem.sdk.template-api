# ----------------------------
# Production stage
# ----------------------------
# Use base image from build argument
ARG DOCKERFILE_NODE_BASE_IMAGE
FROM ${DOCKERFILE_NODE_BASE_IMAGE} AS production

# Set environment variables
ENV NODE_ENV=production \
    TZ=UTC

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Copy pre-built distribution from pipeline artifacts
COPY dist ./dist

# Copy node_modules from pipeline cache
COPY node_modules ./node_modules

# Optional: install debugging/network tools
# Using --no-install-recommends reduces image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    tcpdump \
    iputils-ping \
    telnet \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set ownership of app folder and switch to non-root user
RUN chown -R 1000:1000 /app

# Switch to non-root user 
USER 1000

# Expose application ports
EXPOSE 3232 3235

# Start the application
CMD ["node", "dist/main.js"]
