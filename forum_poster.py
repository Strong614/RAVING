import sys, time, os, base64
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

# Fetch credentials from the environment directly
FORUM_USERNAME = os.environ["FORUM_USERNAME"]
FORUM_PASSWORD = os.environ["FORUM_PASSWORD"]

# Decode the Base64-encoded message back into UTF-8 (preserves newlines)
encoded = sys.argv[1]
forum_message = base64.b64decode(encoded).decode("utf-8")

# Path to your chromedriver
chrome_driver_path = r"C:\Users\gabtn\OneDrive\Desktop\rav-bot\chromedriver-win64\chromedriver.exe"

# Setup headless Chrome
opts = Options()
opts.add_argument("--headless")
service = Service(chrome_driver_path)
driver = webdriver.Chrome(service=service, options=opts)

def login_and_navigate():
    driver.get("https://saesrpg.uk/login/")
    WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

    u = WebDriverWait(driver, 30).until(EC.presence_of_element_located((By.NAME, "auth")))
    p = driver.find_element(By.NAME, "password")
    u.send_keys(FORUM_USERNAME)
    p.send_keys(FORUM_PASSWORD, Keys.RETURN)
    time.sleep(5)

    driver.get("https://saesrpg.uk/forums/topic/42510-rapid-assault-vanguard-media-archive")
    time.sleep(5)

def post_message():
    btn = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.CLASS_NAME, "ipsComposeArea_dummy"))
    )
    driver.execute_script("arguments[0].scrollIntoView();", btn)
    btn.click()

    box = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "[contenteditable='true']"))
    )
    ActionChains(driver).move_to_element(box).click().send_keys(forum_message).perform()
    time.sleep(2)

    submit = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, "//button[@type='submit' and contains(@class,'ipsButton_primary')]"))
    )
    submit.click()
    print("Posted ✅")

if __name__ == "__main__":
    login_and_navigate()
    post_message()
    driver.quit()
