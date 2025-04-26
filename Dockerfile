# Base image with Node.js and Python
FROM node:20-bullseye

# Install system dependencies and Python
RUN apt-get update && \
    apt-get install -y python3 python3-pip wget curl unzip gnupg xdg-utils \
    libxss1 libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 \
    libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libgtk-3-0 libxkbcommon0 && \
    ln -s /usr/bin/python3 /usr/bin/python

# Install latest Chrome (automatically installed from base image updates)
RUN wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -f -y

# Install Chromedriver version 135 to match Chrome version 135
RUN wget https://storage.googleapis.com/chrome-for-testing-public/135.0.7049.114/linux64/chromedriver-linux64.zip && \
    unzip chromedriver-linux64.zip && \
    mv chromedriver-linux64/chromedriver /app/chromedriver && \
    chmod +x /app/chromedriver && \
    rm -rf chromedriver-linux64*

# Create app directory and set working directory
WORKDIR /app

# Copy Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy Python dependencies
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Make sure forum_poster.py is executable (optional)
RUN chmod +x forum_poster.py

# Start the bot
CMD ["node", "bot.js"]
