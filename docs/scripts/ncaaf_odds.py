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

    raw_data = response.json()

    # Filter the data
    filtered_data = filter_odds_data(raw_data)

    # Generate timestamp for the filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_filename = f"odds_stats_raw_{timestamp}.json"
    filtered_filename = f"odds_stats_filtered_{timestamp}.json"

    # Initialize S3 client
    s3 = boto3.client('s3',
                      aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                      aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                      )
    bucket_name = os.environ['S3_BUCKET_NAME']

    # Upload raw data to S3
    upload_to_s3(s3, bucket_name, raw_filename, raw_data)

    # Upload filtered data to S3
    upload_to_s3(s3, bucket_name, filtered_filename, filtered_data)


def filter_odds_data(raw_data):
    filtered_data = []
    for game in raw_data:
        best_odds = {
            "home_team": {"name": game["home_team"], "odds": -float('inf'), "bookmaker": "", "last_update": ""},
            "away_team": {"name": game["away_team"], "odds": -float('inf'), "bookmaker": "", "last_update": ""}
        }

        for bookmaker in game["bookmakers"]:
            for outcome in bookmaker["markets"][0]["outcomes"]:
                team_key = "home_team" if outcome["name"] == game["home_team"] else "away_team"
                if outcome["price"] > best_odds[team_key]["odds"]:
                    best_odds[team_key]["odds"] = outcome["price"]
                    best_odds[team_key]["bookmaker"] = bookmaker["title"]
                    best_odds[team_key]["last_update"] = bookmaker["last_update"]

        filtered_data.append({
            "id": game["id"],
            "sport_key": game["sport_key"],
            "sport_title": game["sport_title"],
            "commence_time": game["commence_time"],
            "home_team": best_odds["home_team"],
            "away_team": best_odds["away_team"]
        })

    return filtered_data


def upload_to_s3(s3_client, bucket_name, filename, data):
    try:
        s3_client.put_object(
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