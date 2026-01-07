import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL

export const redis = redisUrl ? new Redis(redisUrl) : null

export const isProd = process.env.NODE_ENV === 'production'