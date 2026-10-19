#!/bin/sh
# entrypoint.sh — Chạy Prisma migrate rồi start NestJS

set -e

echo "⏳ Chạy Prisma migrate deploy..."
npx prisma migrate deploy

echo "🚀 Khởi động NestJS backend..."
exec node dist/main.js
