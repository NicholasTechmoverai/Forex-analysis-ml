from datetime import datetime
from tick_vault.reader import read_tick_data, PIPET_SIZE_REGISTRY

# Register pipet for EURUSD (1 pip = 0.0001 → pipet = 0.00001)
PIPET_SIZE_REGISTRY["EURUSD"] = 0.00001

# Read tick data from downloaded folder for a date range
df = read_tick_data(
    symbol="EURUSD",
    start=datetime(2026, 1, 2, 2),   # start hour
    end=datetime(2026, 1, 2, 3),     # end hour
    strict=False                      # prevents errors if data is missing
)

# Display
print(df.head())
