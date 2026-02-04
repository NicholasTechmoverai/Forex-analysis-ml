import requests
import json
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("OANDA_API_KEY")
ACCOUNT_ID = os.getenv("OANDA_ACCOUNT_ID")

url = f"https://stream-fxpractice.oanda.com/v3/accounts/{ACCOUNT_ID}/pricing/stream"
params = {"instruments": "EUR_USD"}
headers = {
    "Authorization": f"Bearer {API_KEY}"
}

with requests.get(url, headers=headers, params=params, stream=True) as r:
    for line in r.iter_lines():
        if line:
            data = json.loads(line.decode("utf-8"))
            if data.get("type") == "PRICE":
                print(
                    data["time"],
                    data["bids"][0]["price"],
                    data["asks"][0]["price"]
                )
