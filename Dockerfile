# Stage 1: Build the TypeScript application
FROM node:20-alpine AS build

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
# to leverage Docker's caching and install dependencies first
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your application source code
COPY . .

# Build the TypeScript project into JavaScript
# This assumes you have a "build" script in your package.json (e.g., "tsc")
RUN npm run build

# Stage 2: Create the smaller production-ready image
FROM node:20-alpine AS production

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the build stage:
# 1. node_modules (installed dependencies)
# 2. dist (your compiled JavaScript code)
# 3. .env (your environment variables, if used by the app inside container)
# 4. src/sql (your database initialization script)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/.env ./.env
COPY --from=build /app/src/sql ./src/sql
# Copy the SQL initialization file

# Expose the port your Express app listens on
EXPOSE 8080

# Define the command to run your application when the container starts
# This assumes your compiled entry point is dist/server.js
CMD [ "node", "dist/server.js" ]