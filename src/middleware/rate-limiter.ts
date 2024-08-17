import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../redis-client";

import { Request, Response } from "express";

export const rateLimiter = rateLimit({
   store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
   }),
   windowMs: 60 * 1000, // 1 minute test
   max: 3,

   keyGenerator: (req: Request, res: Response) => req.ip!,
   handler: (req: Request, res: Response) => {
      console.log(`Rate limit exceeded for IP: ${req.ip} `);
      res.status(429).json({
         message: "Too many requests, please try again later.",
      });
   },
   statusCode: 429,
});
