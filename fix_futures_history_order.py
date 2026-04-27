#!/usr/bin/env python3
"""
Fix: Reorder history sources so futures_history (with accurate prices) is processed FIRST.
This ensures that trades with proper open_price/settlement_price appear in the UI.
"""

import re

# Read the server file
with open('/var/www/tgexchange/backend/server.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find get_futures_history function and fix the order
# We need to process trade_code_history FIRST, then others

old_pattern = '''    # Format history items
    history = []
    
    # Add trade code based trades
    for tc in trade_codes_used:'''

new_pattern = '''    # Format history items
    history = []
    
    # PRIORITY: Add trade_code_history FIRST (has accurate prices)
    for th in trade_code_history:
        created_at = th.get("created_at", "")
        try:
            if created_at:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                utc_dt = dt
                formatted_date = utc_dt.strftime("%Y-%m-%d")
                formatted_time = utc_dt.strftime("%H:%M:%S")
                time_period_start = utc_dt.strftime("%H:%M:%S")
                time_period_end = (utc_dt + timedelta(seconds=10)).strftime("%H:%M:%S")
            else:
                formatted_date = "N/A"
                formatted_time = "N/A"
                time_period_start = "00:00:00"
                time_period_end = "00:00:10"
        except:
            formatted_date = "N/A"
            formatted_time = "N/A"
            time_period_start = "00:00:00"
            time_period_end = "00:00:10"
        
        profit = th.get("profit", th.get("profit_loss", th.get("pnl", 0)))
        amount = th.get("amount", th.get("margin", 0))
        profit_percent = th.get("profit_percent", 60)
        open_price = th.get("open_price", th.get("entry_price", 0))
        settlement_price = th.get("settlement_price", th.get("exit_price", 0))
        
        coin = th.get('coin', 'BTC').upper()
        history.append({
            "id": th.get("trade_id", th.get("trade_code", "N/A")),
            "type": "trade_code",
            "status": "Completed",
            "product": f"{coin}/USD",
            "direction": th.get("position_type", th.get("trade_type", "CALL")).upper(),
            "time_period": f"10s({time_period_start}~{time_period_end}) UTC",
            "amount": round(amount, 2),
            "open_position_time": f"{formatted_date} {formatted_time}",
            "open_price": round(open_price, 6),
            "settlement_price": round(settlement_price, 6),
            "turnover": round(amount, 2),
            "profit_loss": round(profit, 2),
            "rate_of_return": round(profit_percent, 2),
            "is_profit": th.get("is_profit", profit > 0),
            "timestamp": created_at,
            "date": formatted_date,
            "trade_code": th.get("trade_code", "")
        })
    
    # Add trade code based trades (fallback for older codes)
    for tc in trade_codes_used:'''

if old_pattern in content:
    content = content.replace(old_pattern, new_pattern)
    print("✅ Step 1: Reordered history processing - futures_history FIRST")
else:
    print("❌ Step 1: Pattern not found - may already be fixed or different format")

# Now remove the duplicate trade_code_history processing at the end
old_duplicate = '''    # Add trade_code_history (trades via trade codes)
    for th in trade_code_history:
        created_at = th.get("created_at", "")
        try:
            if created_at:
                dt = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                # Keep UTC time (exchange standard) - no IST conversion
                utc_dt = dt
                formatted_date = utc_dt.strftime("%Y-%m-%d")
                formatted_time = utc_dt.strftime("%H:%M:%S")
                # 10 seconds gap for time period
                time_period_start = utc_dt.strftime("%H:%M:%S")
                time_period_end = (utc_dt + timedelta(seconds=10)).strftime("%H:%M:%S")
            else:
                formatted_date = "N/A"
                formatted_time = "N/A"
                time_period_start = "00:00:00"
                time_period_end = "00:00:10"
        except:
            formatted_date = "N/A"
            formatted_time = "N/A"
            time_period_start = "00:00:00"
            time_period_end = "00:00:10"
        
        profit = th.get("profit", 0)
        amount = th.get("amount", 0)
        profit_percent = th.get("profit_percent", 0)
        
        coin = th.get('coin', 'BTC').upper()
        history.append({
            "id": th.get("trade_id", th.get("trade_code", "N/A")),
            "type": "trade_code",
            "status": "Completed",
            "product": f"{coin}/USD",
            "direction": th.get("trade_type", "CALL").upper(),
            "time_period": f"10s({time_period_start}~{time_period_end}) UTC",
            "amount": round(amount, 2),
            "open_position_time": f"{formatted_date} {formatted_time}",
            "open_price": round(th.get("open_price", th.get("price", 0)), 6),
            "settlement_price": round(th.get("settlement_price", th.get("price", 0) * 1.001), 6),
            "turnover": round(amount, 2),
            "profit_loss": round(profit, 2),
            "rate_of_return": round(profit_percent, 2),
            "is_profit": profit > 0,
            "timestamp": created_at,
            "date": formatted_date,
            "trade_code": th.get("trade_code", "")
        })
    
    # DEDUPLICATE'''

new_duplicate = '''    # DEDUPLICATE'''

if old_duplicate in content:
    content = content.replace(old_duplicate, new_duplicate)
    print("✅ Step 2: Removed duplicate trade_code_history loop")
else:
    print("⚠️ Step 2: Duplicate loop pattern not found")

# Write the fixed content
with open('/var/www/tgexchange/backend/server.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ Fix applied! Restart the server with: pm2 restart tgexchange-backend")
