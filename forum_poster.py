import sys, time, os, base64
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

# Load environment variables from the .env file
load_dotenv()

# Fetching username and password from environment variables
FORUM_USERNAME = os.environ["FORUM_USERNAME"]
FORUM_PASSWORD = os.environ["FORUM_PASSWORD"]

# Path to the ChromeDriver executable
chrome_driver_path = r"C:\Users\gabtn\OneDrive\Desktop\rav-bot\chromedriver-win64\chromedriver.exe"

# Get the message passed from Discord bot
forum_message = base64.b64decode(sys.argv[1]).decode("utf-8")


# Initialize Chrome options
chrome_options = Options()
chrome_options.add_argument("--headless")  # Run in headless mode (optional)

# Initialize Selenium WebDriver using the Service object
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=chrome_options)

# Example function for logging in
def login():
    driver.get("https://saesrpg.uk/login/")
    time.sleep(5)  # Wait for the page to load fully

    # Wait for the body to load and ensure the page is ready
    WebDriverWait(driver, 30).until(
        EC.presence_of_element_located((By.TAG_NAME, "body"))
    )
    print("Page loaded successfully.")

    try:
        username_field = WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.NAME, "auth"))
        )
        print("Username field located successfully.")
    except Exception as e:
        print(f"Error locating username field by NAME: {e}")
        driver.quit()
        return

    try:
        password_field = driver.find_element(By.NAME, "password")
        print("Password field located successfully.")
    except Exception as e:
        print(f"Error locating password field: {e}")
        driver.quit()
        return

    # Enter credentials and submit
    username_field.send_keys(FORUM_USERNAME)
    password_field.send_keys(FORUM_PASSWORD)
    password_field.send_keys(Keys.RETURN)  # Simulate pressing Enter
    print("Login credentials entered.")
    time.sleep(5)  # Wait for login to process

    # Step 1: Go directly to the Media Archive page
    try:
        print("Navigating directly to the Media Archive...")
        driver.get("https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive")
        print("Media archive page loaded successfully.")
        time.sleep(5)  # Wait for the page to load
    except Exception as e:
        print(f"Error navigating to media archive: {e}")
        driver.quit()
        return

# Function to scroll down and interact with the message box
def interact_with_message_box():
    try:
        # Wait for the message box to be clickable
        print("Waiting for message box to be clickable...")
        message_box_button = WebDriverWait(driver, 40).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "ipsComposeArea_dummy"))
        )
        print("Message box button is clickable.")
        
        # Scroll the page to the message box before clicking it
        driver.execute_script("arguments[0].scrollIntoView();", message_box_button)
        time.sleep(2)  # Wait a bit before clicking
        
        # Click the message box button to open the editable message area
        message_box_button.click()
        time.sleep(2)  # Wait for the editable area to appear
        print("Message box button clicked.")
        
        # Locate the editable message area (where we can type the message)
        message_box = WebDriverWait(driver, 40).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "[contenteditable='true']"))
        )
        print("Message box is ready for input.")
        
        # Ensure it's scrolled into view
        driver.execute_script("arguments[0].scrollIntoView();", message_box)
        time.sleep(1)  # Wait for the scroll to finish
        
        # Ensure visibility of the message box
        WebDriverWait(driver, 10).until(
            EC.visibility_of(message_box)
        )
        
        # Scroll into view and type the message
        ActionChains(driver).move_to_element(message_box).click().perform()
        time.sleep(1)  # Wait before typing
        message_box.send_keys(forum_message)  # Type the message from Discord
        print("Message typed successfully.")
        time.sleep(5)  # Wait to ensure the message is typed
        
        # Submit the message
        submit_button = WebDriverWait(driver, 40).until(
            EC.element_to_be_clickable((By.XPATH, "//button[@type='submit' and contains(@class, 'ipsButton_primary')]"))
        )
        submit_button.click()
        print("Message posted successfully!")

    except Exception as e:
        print(f"Error interacting with message box: {e}")
    else:
        print("Message posted successfully!")

# Calling the login function and then interacting with the message box
login()
interact_with_message_box()
