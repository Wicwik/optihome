FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json* /app/

# Install dependencies (this layer will be cached if package.json doesn't change)
RUN npm install

# Copy the rest of the app
COPY . /app

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]



