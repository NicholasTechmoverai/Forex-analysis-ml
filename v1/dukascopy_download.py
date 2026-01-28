from datetime import datetime
from tick_vault import download_range, read_tick_data 
import asyncio

symbol = "EURUSD"
start = datetime(2026, 1, 1)
end   = datetime(2026, 1, 3)

# 1️⃣ Download tick data asynchronously
async def download_data():
    await download_range(symbol=symbol, start=start, end=end)

# Run the async download
asyncio.run(download_data())

# 2️⃣ Read downloaded data into a pandas DataFrame
df = read_tick_data(symbol=symbol, start=start, end=end)

print(df.head())
