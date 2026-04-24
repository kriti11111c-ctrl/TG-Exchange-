# Gunicorn Configuration for High Performance VPS
# Optimized for 300K+ concurrent users

import multiprocessing

# Server Socket
bind = "0.0.0.0:8001"
backlog = 2048

# Worker Processes
# For high-traffic VPS: workers = (2 x CPU cores) + 1
# Minimum 4 workers for 300K users
workers = max(multiprocessing.cpu_count() * 2 + 1, 8)
worker_class = "uvicorn.workers.UvicornWorker"

# Worker Connections (async)
worker_connections = 5000

# Timeout
timeout = 120
graceful_timeout = 30
keepalive = 5

# Request limits
max_requests = 10000
max_requests_jitter = 1000

# Logging
loglevel = "info"
accesslog = "/var/log/gunicorn/access.log"
errorlog = "/var/log/gunicorn/error.log"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process Naming
proc_name = "tg_exchange"

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# Performance
preload_app = True
