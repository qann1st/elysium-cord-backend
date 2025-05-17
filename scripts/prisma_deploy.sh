#!/usr/bin/env sh

. .env.development

DATABASE_URL=$DATABASE_URL npx prisma migrate deploy