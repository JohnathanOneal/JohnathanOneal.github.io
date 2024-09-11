import requests
import json
import os
from datetime import datetime


def fetch_wanikani_stats():
    api_key = os.environ['WANIKANI_API_KEY']
    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    # Fetch level up stats and write to JSON
    level_url = 'https://api.wanikani.com/v2/level_progressions'
    response = requests.get(level_url, headers=headers)
    data = response.json()

    with open('../data/wanikani_stats.json', 'w') as f:
        json.dump(data, f, indent=2)


    stats_url = 'https://api.wanikani.com/v2/review_statistics'
    all_data = []

    # API call returns in pages of 500 have to go in batches
    while stats_url:
        response = requests.get(stats_url, headers=headers)
        response_data = response.json()
    
        # Add the current batch of data to the all_data list
        all_data.extend(response_data['data'])
    
        # Get the next URL from the response, if available
        stats_url = response_data['pages'].get('next_url')

    # Write the complete data to a JSON file
    with open('../data/all_review_statistics.json', 'w') as file:
        json.dump(all_data, file, indent=4)

if __name__ == "__main__":
    fetch_wanikani_stats()
