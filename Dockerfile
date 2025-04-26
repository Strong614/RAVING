# Base image with Node.js and Python
FROM node:20-bullseye

# Install Python and pip
RUN apt-get update && \
    apt-get install -y python3 python3-pip wget curl unzip && \
    apt-get clean

# Install Google Chrome
RUN apt-get update && \
    apt-get install -y wget gnupg curl unzip xdg-utils libxss1 libappindicator3-1 libasound2 libatk-bridge2.0-0 \
    libatk1.0-0 libcups2 libdbus-1-3 libgdk-pixbuf2.0-0 libnspr4 libnss3 libx11-xcb1 libxcomposite1 \
    libxdamage1 libxrandr2 libgbm1 libgtk-3-0 libxkbcommon0 && \
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -f -y


# Copy the chromedriver into the container
COPY chromedriver-win64/chromedriver.exe /app/chromedriver



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

