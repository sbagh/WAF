import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../redis-client";
import { logRequest } from "../logger";
import { Request, Response } from "express";

export const rateLimiter = rateLimit({
   store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
   }),
   windowMs: 60 * 1000, // 1 minute test
   max: 3,

   keyGenerator: (req: Request, res: Response) => req.ip!,
   handler: (req: Request, res: Response) => {
      const remainingRequests = res.getHeader("X-RateLimit-Remaining") as
         | string
         | undefined;
      const resetTime = res.getHeader("X-RateLimit-Reset") as
         | string
         | undefined;

      logRequest({
         timestamp: new Date().toISOString(),
         ip: req.ip!,
         method: req.method,
         url: req.originalUrl,
         userAgent: req.headers["user-agent"] || "unknown",
         blockType: "RateLimit",
         blockReason: "Rate limit exceeded",
         remainingRequests: remainingRequests
            ? parseInt(remainingRequests, 10)
            : 0,
         windowMs: resetTime ? parseInt(resetTime as string, 10) * 1000 : null, // Convert to milliseconds
      });

      res.status(429).json({
         message: "Too many requests, please try again later.",
      });
   },
   statusCode: 429,
});
