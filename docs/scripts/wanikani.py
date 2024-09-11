import requests
import json
import os
from datetime import datetime


def fetch_wanikani_stats():
    api_key = os.environ['WANIKANI_API_KEY']
    api_url = 'https://api.wanikani.com/v2/summary'

    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    response = requests.get(api_url, headers=headers)
    data = response.json()

    # Extract relevant information
    lessons = data['data']['lessons'][0]['lessons']
    reviews = data['data']['reviews'][0]['reviews']
    level = data['data']['user']['level']

    stats = {
        'level': level,
        'lessons': len(lessons),
        'reviews': len(reviews),
        'last_updated': datetime.now().isoformat()
    }

    # Write stats to a JSON file
    with open('wanikani_stats.json', 'w') as f:
        json.dump(stats, f, indent=2)

if __name__ == "__main__":
    fetch_wanikani_stats()
