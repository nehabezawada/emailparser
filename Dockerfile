# Use Node.js 18 as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies for both server and client
RUN npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p data

# Build the React app
RUN cd client && npm run build

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["npm", "start"] 