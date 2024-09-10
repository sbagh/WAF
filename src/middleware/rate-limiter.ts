import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../utils/redis-client";
import { logRequest } from "../utils/logger";
import { Request, Response } from "express";
import fs from "fs";
import path from "path";

interface BlockedIP {
   ip: string;
   blockReason: string;
}

const WINDOW_TIME = 5000; //ms - just for testing
const MAX_REQUESTS = 10;
const RATE_LIMIT_VIOLATION_THRESHOLD = 5;
const VIOLATION_EXPIRATION = 20; //seconds

// Load blocked IPs from the JSON file
const filePath = path.join(__dirname, "../tempStorage/blockedIPs.json");
let blockedIPs = JSON.parse(fs.readFileSync(filePath, "utf-8"));

// Get the violation count from Redis
const getViolationCount = async (ip: string): Promise<number> => {
   const count = await redisClient.get(`rate_limit_violations:${ip}`);
   return count ? parseInt(count, 10) : 0;
};

// increment the violation count in Redis
const incrementViolationCount = async (ip: string): Promise<void> => {
   await redisClient.incr(`rate_limit_violations:${ip}`);
   await redisClient.expire(
      `rate_limit_violations:${ip}`,
      VIOLATION_EXPIRATION
   );
};

export const rateLimiter = rateLimit({
   store: new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
   }),
   windowMs: WINDOW_TIME,
   max: MAX_REQUESTS,

   keyGenerator: (req: Request, res: Response) => req.ip!,

   handler: async (req: Request, res: Response) => {
      const clientIP = req.ip!;

      // increment and get violation count from Redis
      await incrementViolationCount(clientIP);
      const violationCount = await getViolationCount(clientIP);

      if (violationCount >= RATE_LIMIT_VIOLATION_THRESHOLD) {
         const isAlreadyBlocked = blockedIPs.some(
            (blockedIP: BlockedIP) => blockedIP.ip === clientIP
         );

         // Add the IP to the blocklist if it hasn't been added yet
         if (!isAlreadyBlocked) {
            blockedIPs.push({
               ip: clientIP,
               blockReason: "Rate limit exceeded",
            });

            // Save to the JSON file
            fs.writeFileSync(filePath, JSON.stringify(blockedIPs, null, 2));

            logRequest({
               timestamp: new Date().toISOString(),
               ip: clientIP,
               method: req.method,
               url: req.originalUrl,
               userAgent: req.headers["user-agent"] || "unknown",
               blockType: "IP Blocked after repeated rate-limits",
               blockReason: "Exceeded rate-limit violation threshold",
               remainingRequests: 0,
               windowMs: null,
            });
         }
      } else {
         // Log rate-limit violation without blocking
         logRequest({
            timestamp: new Date().toISOString(),
            ip: clientIP,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.headers["user-agent"] || "unknown",
            blockType: "RateLimit",
            blockReason: "Rate limit exceeded",
            remainingRequests: 0,
            windowMs: parseInt(
               res.getHeader("X-RateLimit-Reset") as string,
               10
            ),
         });
      }

      res.status(429).json({
         message: "Too many requests, please try again later.",
      });
   },

   statusCode: 429,
});
