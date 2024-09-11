import requests
import json
import os
from datetime import datetime


def fetch_wanikani_stats():
    api_key = os.environ['WANIKANI_API_KEY']
    api_url = 'https://api.wanikani.com/v2/level_progressions'

    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    response = requests.get(api_url, headers=headers)
    data = response.json()

    # Write stats to a JSON file
    with open('wanikani_stats.json', 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    fetch_wanikani_stats()
