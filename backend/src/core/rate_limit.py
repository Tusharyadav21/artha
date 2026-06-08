from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
"""
Purpose:
    Provides rate limiting capabilities for the API endpoints using slowapi.

Responsibilities:
    - Define the rate limiting strategy.
    - Provide a key function to identify unique clients (via remote address).

Dependencies:
    - slowapi
"""

