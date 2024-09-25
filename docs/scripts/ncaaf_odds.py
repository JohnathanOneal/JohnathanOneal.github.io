import requests
import json
import os
from datetime import datetime
import boto3
from botocore.exceptions import ClientError


def fetch_odds_stats():
    api_key = os.environ['ODDS_API_KEY']
    url = "https://api.the-odds-api.com/v4/sports/americanfootball_ncaaf/odds/"

    params = {
        "apiKey": api_key,
        "regions": "us",
        "markets": "h2h",
        "oddsFormat": "american"
    }

    response = requests.get(url, params=params)

    if response.status_code != 200:
        raise Exception(f"API request failed with status code {response.status_code}: {response.text}")

    data = response.json()

    # Generate timestamp for the filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"ncaaf_odds_stats_{timestamp}.json"

    # Initialize S3 client
    s3 = boto3.client('s3',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                      )
    bucket_name = os.environ['S3_BUCKET_NAME']

    # Upload data to S3
    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=filename,
            Body=json.dumps(data, indent=2),
            ContentType='application/json'
        )
        print(f"Successfully uploaded {filename} to S3 bucket {bucket_name}")
    except ClientError as e:
        raise Exception(f"Error uploading {filename} to S3: {e}")


if __name__ == "__main__":
    fetch_odds_stats()