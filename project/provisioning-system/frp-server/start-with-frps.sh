#!/bin/bash
set -e

FRPS_CONFIG="${FRPS_CONFIG:-/etc/frp/frps.ini}"

# Start FRP server with logging
/usr/local/bin/frps -c "$FRPS_CONFIG" &
FRPS_PID=$!

echo "Started frps (PID $FRPS_PID) using $FRPS_CONFIG"

# Optionally follow log file to stdout if logging to file
if grep -q '^log_file' "$FRPS_CONFIG"; then
    LOG_FILE=$(grep '^log_file' "$FRPS_CONFIG" | awk '{print $3}')
    [ -f "$LOG_FILE" ] && tail -F "$LOG_FILE" &
fi

exec python frp_instance_manager.py
