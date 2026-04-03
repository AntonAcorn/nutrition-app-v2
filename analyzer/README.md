# Analyzer service

Отдельный async worker/service.

Задача:
- забирать pending analysis_requests
- выполнять анализ фото
- складывать draft result
- не создавать confirmed meal entries напрямую

На первом этапе это может быть простой polling worker или отдельный HTTP service.
