package com.aiduparc.nutrition.security;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.stereotype.Component;

/**
 * Fixed-window per-key counter. Single-instance only — for the current docker-compose
 * deployment there is one backend pod. If we ever go multi-instance, replace with
 * Redis or move the rate limit to Caddy.
 */
@Component
public class AuthRateLimiter {

    private static final class Window {
        final long startMs;
        final AtomicInteger count;

        Window(long startMs) {
            this.startMs = startMs;
            this.count = new AtomicInteger(0);
        }
    }

    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key, int max, Duration window) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        while (true) {
            Window existing = windows.get(key);
            if (existing == null || now - existing.startMs >= windowMs) {
                Window fresh = new Window(now);
                fresh.count.incrementAndGet();
                Window prev = windows.putIfAbsent(key, fresh);
                if (prev == null) {
                    return true;
                }
                // Lost the race — fall back to the existing window we just lost to.
                if (now - prev.startMs < windowMs) {
                    return prev.count.incrementAndGet() <= max;
                }
                // The other thread also inserted a stale window; retry to roll our own.
                windows.remove(key, prev);
                continue;
            }
            return existing.count.incrementAndGet() <= max;
        }
    }
}
