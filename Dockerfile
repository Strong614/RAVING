# Base image with Node.js and Debian Bullseye
FROM node:20-bullseye

# Set environment variable to avoid prompts during package installs
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip wget curl unzip gnupg xdg-utils \
    libxss1 libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 libxkbcommon0 && \
    ln -s /usr/bin/python3 /usr/bin/python

# Install Google Chrome (version 135)
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb || true && \
    apt-get install -f -y && \
    rm google-chrome-stable_current_amd64.deb

# Create app directory and set working directory
WORKDIR /app

# Install Chromedriver (version 135 to match Chrome)
RUN wget https://storage.googleapis.com/chrome-for-testing-public/135.0.7049.114/linux64/chromedriver-linux64.zip && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver ./chromedriver && \
    chmod +x ./chromedriver && \
    rm -rf chromedriver-linux64*

# Copy Node.js dependencies and install
COPY package*.json ./
RUN npm install

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Ensure forum_poster.py is executable
RUN chmod +x forum_poster.py

# Start the Discord bot
CMD ["node", "bot.js"]
