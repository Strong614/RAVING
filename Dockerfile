# Base image with Node.js and Python
FROM node:20-bullseye

# Install Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip wget curl unzip && \
    apt-get clean

# Install Google Chrome
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb && \
    apt-get install -f -y

# Copy the chromedriver into the container
COPY chromedriver /app/chromedriver

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

# Install any other dependencies you need for your app
RUN apt-get update && apt-get install -y libnss3 libgdk-pixbuf2.0-0 libxss1 libasound2

# Make sure forum_poster.py is executable
RUN chmod +x forum_poster.py

# Run the bot (or any other command)
CMD ["node", "bot.js"]

