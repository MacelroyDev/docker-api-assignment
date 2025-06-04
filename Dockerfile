# Stage 1: Build the TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
# This means npm install only runs if package.json changes
COPY package*.json ./

# Install production dependencies
RUN npm install

# Copy all other source code
COPY . .

# Build the TypeScript code (compiles .ts to .js in the 'dist' folder)
RUN npm run build

# Stage 2: Create a smaller, leaner production image
FROM node:18-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
# Copy node_modules (production dependencies)
COPY --from=builder /app/node_modules ./node_modules
# Copy the compiled JavaScript application code
COPY --from=builder /app/dist ./dist
# Copy package.json to run 'npm start' (if needed, though 'node dist/server.js' is enough)
COPY --from=builder /app/package.json ./package.json

# Expose the port your Express app will listen on
EXPOSE 8080

# Define the command to run your application when the container starts
CMD ["node", "dist/server.js"]