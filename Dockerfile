# Use a base image with Node.js pre-installed
FROM node:14

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the application code to the container
COPY . .

# Expose the port your application listens on (if it's not already defined in your application code)
EXPOSE 8080

# Set the command to run your application
CMD ["node", "main.js"]