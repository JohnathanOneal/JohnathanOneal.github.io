import pandas as pd
from playwright.sync_api import sync_playwright
import kenpom_constants
import boto3
import os
from botocore.exceptions import ClientError
import argparse


def extract_table_rows(page):
    """Extract the table rows from the page."""
    return page.evaluate("""
        () => {
            return Array.from(document.querySelectorAll('#ratings-table tbody tr'))
                        .map(row => Array.from(row.querySelectorAll('td'))
                             .map(td => td.innerText.trim()));
        }
    """)


def is_current_season(season):
    now = pd.Timestamp.now()
    return season == now.year if now.month <= 5 else season - 1 == now.year


def scrape_kenpom_table(page, url, year):

    """Scrape the KenPom table from the page."""
    headers = kenpom_constants.PAGE_INFO[url]
    rows = extract_table_rows(page)

    # Check if the number of rows matches the number of columns
    if len(rows) > 0 and len(rows[0]) != len(headers):
        raise ValueError(f"Number of columns ({len(headers)}) does not match number of columns in data ({len(rows[0])})")

    # Create a DataFrame from the extracted data
    df = pd.DataFrame(rows, columns=headers)

    # Convert columns to appropriate data types
    if 'Kenpom_Rating' in df.columns:
        df['Kenpom_Rating'] = df['Kenpom_Rating'].astype(int)
    if 'Record' in df.columns:
        df[['Wins', 'Losses']] = df['Record'].str.split('-', expand=True)
        df = df.drop(columns='Record')

    for col in df.columns:
        if col.endswith('Rtg') or col.endswith('T'):
            df[col] = df[col].str.replace(',', '').astype(float)
        elif col.endswith('_Rank'):
            df[col] = df[col].str.extract(r'(\d+)', expand=False).astype(int)

    df['Team'] = df['Team'].str.replace(r'[\d*]', '', regex=True).str.strip().str.lower()

    df['Season'] = int(year)

    return df


def fetch_kenpom_data(begin_season=2025,end_season=2025):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        breakpoint()
        # Login to kenpom
        page.goto("https://kenpom.com/")
        page.fill("input[name='email']", os.environ['KENPOM_USERNAME'])
        page.fill("input[name='password']", os.environ['KENPOM_PASSWORD'])
        page.click("input[type='submit']")

        # Wait for navigation to complete
        page.wait_for_timeout(7000)

        seasonFrames = {}

        # Confirm login success and scrape data
        if "logout" in page.content():

            for season in range(begin_season, end_season + 1):
                frames = []
                page.wait_for_timeout(4000)
                for url in kenpom_constants.PAGE_INFO.keys():
                    page.wait_for_timeout(5000)
                    page.goto(f"{url}?y={season}")
                    df = scrape_kenpom_table(page, url, season)
                    frames.append(df)

                merged_df = frames[0]
                for df in frames[1:]:
                    merged_df = pd.merge(merged_df, df, on=['Team', 'Season'], how='outer', suffixes=('', '_drop'))
                merged_df = merged_df.loc[:, ~merged_df.columns.str.endswith('_drop')]

                if is_current_season(season):
                    month_and_day = pd.Timestamp.now().strftime('%m%d')
                    seasonFrames.update({f"{season}_{month_and_day}": merged_df})
                else:
                    seasonFrames.update({f"{season}": merged_df})

        else:
            print("Login failed")

        browser.close()
        return seasonFrames

def upload_to_s3(s3_client, bucket_name, filename, data):
    try:
        s3_client.put_object(
            Bucket=bucket_name,
            Key=filename,
            Body=data,
            ContentType='text/csv'
        )
        print(f"Successfully uploaded {filename} to S3 bucket {bucket_name}")
    except ClientError as e:
        raise Exception(f"Error uploading {filename} to S3: {e}")

def main(begin_season, end_season):
    # Initialize S3 client and bucket name
    #s3 = boto3.client(
    #    's3',
    #    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
    #    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    #)
    #bucket_name = os.environ['S3_BUCKET_NAME']

    # Fetch data for each season
    seasonFrames = fetch_kenpom_data(begin_season=begin_season, end_season=end_season)
    
    # Loop through each season's DataFrame and upload it to S3
    for key, value in seasonFrames.items():
        # Convert DataFrame to CSV format (in memory) for uploading
        csv_data = value.to_csv(index=False)
        filename = f"kenpom_{key}.csv"
        
        # Upload CSV data to S3
        upload_to_s3(s3, bucket_name, filename, csv_data)

if __name__ == "__main__":
    # Argument parser for command-line arguments
    parser = argparse.ArgumentParser(description="Upload KenPom data to S3")
    parser.add_argument("--b", "--begin_season", type=int, required=True, help="Beginning season year")
    parser.add_argument("--e", "--end_season", type=int, required=True, help="Ending season year")
    args = parser.parse_args()
    
    # Run the main function with provided begin and end season years
    main(begin_season=args.b, end_season=args.e)

