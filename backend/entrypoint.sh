#!/bin/sh
# entrypoint.sh — Đồng bộ schema Prisma + seed dữ liệu mẫu rồi start NestJS

set -e

echo "⏳ Đồng bộ schema Prisma (db push)..."
npx prisma db push --accept-data-loss

echo "🌱 Seed dữ liệu mẫu (10 món, 15 nguyên liệu, BOM Recipes & 3 tài khoản RBAC)..."
npx prisma db seed

echo "🚀 Khởi động NestJS backend..."
exec node dist/main.js
