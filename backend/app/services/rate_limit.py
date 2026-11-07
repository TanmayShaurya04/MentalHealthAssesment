"""Small in-memory sliding-window rate limiter (per client IP, per rule).

Good enough for a single server process. If you run several instances behind a load balancer,
put the limit in the proxy (nginx / Cloudflare) or swap this for Redis.
"""
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

# (path prefix, methods, limit, window seconds, rule name)
RULES = [
    ("/api/auth/login", {"POST"}, 10, 60, "login"),
    ("/api/auth/register", {"POST"}, 6, 300, "register"),
    ("/api/auth/forgot-password", {"POST"}, 5, 300, "forgot"),
    ("/api/auth/reset-password", {"POST"}, 10, 300, "reset"),
    ("/api/chat/sessions/", {"POST"}, 30, 60, "chat"),
    ("/api/", {"POST", "PATCH", "PUT", "DELETE"}, 120, 60, "write"),
    ("/api/", {"GET"}, 600, 60, "read"),
]


class SlidingWindowLimiter:
    def __init__(self):
        self.hits: Dict[Tuple[str, str], Deque[float]] = defaultdict(deque)

    def check(self, key: str, rule: str, limit: int, window: int, now: Optional[float] = None) -> Tuple[bool, int]:
        now = time.monotonic() if now is None else now
        q = self.hits[(key, rule)]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            return False, max(1, int(window - (now - q[0])))
        q.append(now)
        return True, 0

    def reset(self) -> None:
        self.hits.clear()


limiter = SlidingWindowLimiter()


def client_ip(request: Request) -> str:
    # Behind a proxy (Render, Vercel, nginx) the real address is the first X-Forwarded-For entry.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if settings.RATE_LIMIT_ENABLED and request.url.path.startswith("/api/") and request.method != "OPTIONS":
            ip = client_ip(request)
            for prefix, methods, limit, window, name in RULES:
                if request.url.path.startswith(prefix) and request.method in methods:
                    ok, retry = limiter.check(ip, name, limit, window)
                    if not ok:
                        return JSONResponse(
                            status_code=429,
                            content={"detail": f"Too many requests. Please try again in {retry} seconds."},
                            headers={"Retry-After": str(retry)},
                        )
                    # The most specific rule only for auth/chat; always also apply the general read/write rule.
                    if name in ("login", "register", "forgot", "reset", "chat"):
                        continue
                    break
        return await call_next(request)
