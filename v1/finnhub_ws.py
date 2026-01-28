import asyncio
import websockets
import json
from datetime import datetime
from dotenv import load_dotenv
import os

# Load variables from .env
load_dotenv()

API_KEY = os.getenv("FINNHUB_API_KEY")

async def finnhub_stream():
    uri = f"wss://ws.finnhub.io?token={API_KEY}"
    async with websockets.connect(uri) as ws:
        # Subscribe to EUR/USD
        await ws.send(json.dumps({"type":"subscribe","symbol":"OANDA:EUR_USD"}))
        print("Subscribed to live EUR/USD")

        while True:
            msg = await ws.recv()
            data = json.loads(msg)
            if data.get("type") == "trade":
                for tick in data.get("data", []):
                    price = tick["p"]
                    timestamp = datetime.fromtimestamp(tick["t"]/1000)
                    print(f"[LIVE] {timestamp} → {price}")

# Run WebSocket
asyncio.run(finnhub_stream())
