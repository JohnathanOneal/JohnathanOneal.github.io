import requests
import json
import os
from datetime import datetime
import boto3
from botocore.exceptions import ClientError


def fetch_wanikani_stats():
    api_key = os.environ['WANIKANI_API_KEY']
    headers = {
        'Authorization': f'Bearer {api_key}'
    }

    # Initialize S3 client
    s3 = boto3.client('s3',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )
    bucket_name = os.environ['S3_BUCKET_NAME']

    # Fetch level up stats and write to JSON
    level_url = 'https://api.wanikani.com/v2/level_progressions'
    response = requests.get(level_url, headers=headers)
    data = response.json()

    # Upload level stats to S3
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key='wanikani_stats.json',
            Body=json.dumps(data, indent=2),
            ContentType='application/json'
        )
    except ClientError as e:
        print(f"Error uploading wanikani_stats.json to S3: {e}")


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

        # Upload review statistics to S3
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key='all_review_statistics.json',
            Body=json.dumps(all_data, indent=4),
            ContentType='application/json'
        )
    except ClientError as e:
        print(f"Error uploading all_review_statistics.json to S3: {e}")

if __name__ == "__main__":
    fetch_wanikani_stats()
