"""
Security Middleware - HTTP Security Headers and Rate Limiting
"""
from fastapi import Request, HTTPException
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time
import os


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        # Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Prevent clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # XSS Protection (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer policy
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        
        # HSTS (only enable if using HTTPS in production)
        if os.getenv("ENVIRONMENT", "development") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting for login endpoints to prevent brute force attacks"""
    
    def __init__(self, app, requests_per_minute: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)  # IP -> list of timestamps
        
        # Endpoints to rate limit
        self.protected_endpoints = [
            "/api/auth/login",
            "/api/customers/login",
            "/api/customers/register"
        ]
    
    async def dispatch(self, request: Request, call_next):
        # Only rate limit specific endpoints
        if request.url.path in self.protected_endpoints and request.method == "POST":
            client_ip = self._get_client_ip(request)
            
            if not self._is_allowed(client_ip):
                raise HTTPException(
                    status_code=429,
                    detail="Demasiados intentos. Por favor espera un minuto antes de intentar de nuevo."
                )
            
            self._record_request(client_ip)
        
        return await call_next(request)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP, considering proxies"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _is_allowed(self, client_ip: str) -> bool:
        """Check if client is allowed to make request"""
        now = time.time()
        minute_ago = now - 60
        
        # Clean old requests
        self.requests[client_ip] = [
            ts for ts in self.requests[client_ip] if ts > minute_ago
        ]
        
        return len(self.requests[client_ip]) < self.requests_per_minute
    
    def _record_request(self, client_ip: str):
        """Record a request from client"""
        self.requests[client_ip].append(time.time())
