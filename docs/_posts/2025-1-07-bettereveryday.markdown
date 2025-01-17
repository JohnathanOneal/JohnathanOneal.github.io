---
layout: post
title:  "What is Better Everyday?"
date:   2025-01-07 16:37:09 -0400
categories: [bettereveryday]
---

Better Everyday: Where Data Meets Daily Achievement - Transforming Goals into Living Heat Maps

*(Click on the Better Everday tab to see the heat map!)*

<div class="image-grid">
  <img src="/assets/bettereveryday_photos/endurance_boat_pull.webp" alt="Endurance Boat Pull">
  <img src="/assets/bettereveryday_photos/endurance_soccer.webp" alt="Endurance Soccer">
</div>

**Image 1:** Shackleton's crew hauling their lifeboat across Antarctic ice, *1915-1916* **Image 2:** The same crew finding enjoyment in the face of adversity

Better Everyday is a program I created to track and elevate daily goals beyond routine patterns. The system focuses on seven key areas of personal growth that I've been consistently working on throughout the past year. Going forward, for 2025 I've implemented a structured tracking system to bring enhanced visibility to these practices.
While these habits are already integrated into my weekly routine, the program addresses a specific challenge: the tendency for established habits to plateau once they become automatic. 

Better Everyday isn't designed for building new habits from scratch, as that could prove overwhelming.
The program's real value emerges through its daily tracking system. By maintaining visibility of these seven areas, it creates a path for pushing past complacency by taking consistent routines to the next level. Each day's data contributes to a growing picture of progress, helping turn steady habits into lasting achievements.

The accountability system operates on a structured daily schedule. At 8 PM, I receive a notification outlining my seven goals and prompting me to assess my performance for the day. This evening timing allows for completion of any remaining goals while ensuring the day's achievements are still fresh in memory. Once I submit my responses before the midnight deadline, the website automatically updates with that day's score out of seven, maintaining an ongoing record of progress.

## Why Have Image of Some Antarctic Crew? 
The journey of the Endurance crew is one of the most extraordinary examples of perseverance and teamwork in history. Trapped in the unforgiving Antarctic, they not only survived against overwhelming odds but pushed through relentless trials that tested every ounce of their strength, resourcefulness, and resilience. Through impossible journeys across ice, open water, and treacherous terrain, their unwavering determination and commitment to one another became a testament to the power of leadership, grit, and unity.

What stands out to me is their ability to find moments of joy and camaraderie even in the face of adversity. It’s a reminder that hard work and teamwork don’t just help overcome challenges—they can also create shared strength and resilience. While I’ll probably never face anything as extreme as the Endurance crew’s journey, their story inspires me to work hard, support those around me, and keep pushing forward. Whenever I look at these images, I feel an energy boost, reminding me that perseverance and finding light in tough moments can make all the difference.

The book about this journey remains one of my favorites of all time, and I strongly encourage you to give it a read! [Endurance on Goodreads](https://www.goodreads.com/book/show/139069.Endurance)


## How Does it Work?

In this section, we'll walk through the code for a Telegram bot that tracks daily progress. The bot interacts via messages, saves your daily ratings, and logs its activity. Here's how it works:

---

#### 1. Setting Up Logging

The logging system helps track what the bot is doing and debug issues:

```python
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/path/to/logfile.log'),  # Replace with your log file path
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)
```
Replace /path/to/logfile.log with your desired file path.

#### 2. Saving Daily Ratings

The bot saves your ratings in a JSON file for easy tracking:

```python
import json
from datetime import datetime

def save_rating(rating):
    try:
        with open('/path/to/activity-data.json', 'r') as f:  # Replace with your JSON file path
            ratings = json.load(f)
    except FileNotFoundError:
        ratings = {}
    
    today = datetime.now()
    year = str(today.year)
    month_day = today.strftime("%m-%d")
    
    if year not in ratings:
        ratings[year] = {}
    
    ratings[year][month_day] = rating
    
    with open('/path/to/activity-data.json', 'w') as f:
        json.dump(ratings, f, indent=2)
    logger.info(f"Saved rating {rating} for {year}-{month_day}")
```

This function:
    Loads existing data or initializes a new file.
    Saves your daily rating in the format year -> date -> rating.
    
3. Interacting with the Bot

Here’s the code for the bot’s basic interactions:

```python
from telegram.ext import Application, CommandHandler, MessageHandler, filters

async def start(update, context):
    await update.message.reply_text("How would you rate your day? (1-7)")

async def handle_rating(update, context):
    try:
        rating = int(update.message.text)
        if 1 <= rating <= 7:
            save_rating(rating)
            await update.message.reply_text(f"✅ Saved rating: {rating}/7")
        else:
            await update.message.reply_text("Please send a number between 1-7.")
    except ValueError:
        await update.message.reply_text("Invalid input. Please send a number between 1-7.")
```

### 4. Running the Bot

The main function sets everything up:

```python
def main():
    application = Application.builder().token("YOUR_TOKEN_HERE").build()  # Replace with your bot token

    application.add_handler(CommandHandler("start", start))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_rating))
    
    application.run_polling()

if __name__ == '__main__':
    main()
```

replace "YOUR_TOKEN_HERE" with your bot’s API token from Telegram. This function:

    Registers the commands and message handlers.
    Starts polling to listen for messages.
    
5. Sending the Reminder

The bot will send the message on initialization
```python
async def post_init(application):
    await application.bot.send_message(
        YOUR_USER_ID,  # Replace with your Telegram user ID
        (
            "Did you get better today?\n" # Insert goals below
            "1. \n"
            "2. \n"
            "3. \n"
            "4. \n"
            "5. \n"
            "6. \n"
            "7. "
        )
    )

    
    
6. Final Notes

    Replace personal file paths, the token, and user ID with your own data.
    The bot tracks daily progress, saves ratings, and can send reminders to encourage you.

This script makes it easy to combine accountability and technology for personal growth!
