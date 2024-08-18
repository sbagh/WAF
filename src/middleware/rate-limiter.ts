import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../redis-client";
import { logRequest } from "../logger";
import { Request, Response } from "express";

const windowTime = 5000; //ms - just for testing
const maxRequests = 2;

export const rateLimiter = rateLimit({
   store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
   }),
   windowMs: windowTime,
   max: maxRequests,

   keyGenerator: (req: Request, res: Response) => req.ip!,
   handler: (req: Request, res: Response) => {
      const remainingRequests = res.getHeader("X-RateLimit-Remaining") as
         | string
         | null;
      const resetTime = res.getHeader("X-RateLimit-Reset") as string | null;

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
         windowMs: resetTime ? parseInt(resetTime as string, 10) : null, // Convert to milliseconds
      });

      res.status(429).json({
         message: "Too many requests, please try again later.",
      });
   },
   statusCode: 429,
});
