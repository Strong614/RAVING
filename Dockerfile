# Base image with Node.js and Python
FROM node:20-bullseye

# Install Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    apt-get clean

# Create app directory
WORKDIR /app

# Copy Node files
COPY package*.json ./
RUN npm install

# Copy Python dependencies (if needed)
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy all remaining files
COPY . .

# Start the bot
CMD ["node", "bot.js"]
