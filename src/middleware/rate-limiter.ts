import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import redisClient from "../utils/redis-client";
import { logRequest } from "../utils/logger";
import fs from "fs";
import path from "path";

interface BlockedIP {
   ip: string;
   blockReason: string;
   blockedUntil: string;
}

const WINDOW_TIME = 3000; //ms - possibly make it a sliding window
const MAX_REQUESTS = 10;
const RATE_LIMIT_VIOLATION_THRESHOLD = 10;
const VIOLATION_EXPIRATION = 20; //expiration in redis (s)
const BLOCK_DURATION = 10000; //ms

// load blocked IPs from JSON file
const filePath = path.join(__dirname, "../tempStorage/blockedIPs.json");
let blockedIPs = JSON.parse(fs.readFileSync(filePath, "utf-8"));

// save blocked IPs to the JSON file
const saveBlockedIPs = () => {
   fs.writeFileSync(filePath, JSON.stringify(blockedIPs, null, 2));
};

// get violation count from Redis
const getViolationCount = async (ip: string): Promise<number> => {
   const count = await redisClient.get(`rate_limit_violations:${ip}`);
   return count ? parseInt(count, 10) : 0;
};

// increment violation count in Redis
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
   keyGenerator: (req, res) => req.ip!, // i think this is the default, not necessary

   // handler for when rate limit is exceeded
   handler: async (req, res) => {
      const clientIP = req.ip!;

      // increment and get violation count from Redis
      await incrementViolationCount(clientIP);
      const violationCount = await getViolationCount(clientIP);

      // block the ip if rate-limit violations have hit the threshold
      if (violationCount >= RATE_LIMIT_VIOLATION_THRESHOLD) {
         const isAlreadyBlocked = blockedIPs.some(
            (blockedIP: BlockedIP) => blockedIP.ip === clientIP
         );

         if (!isAlreadyBlocked) {
            const blockedUntil = new Date(
               Date.now() + BLOCK_DURATION
            ).toISOString();

            blockedIPs.push({
               ip: clientIP,
               blockReason: "Rate limit threshold reached",
               blockedUntil,
            });

            saveBlockedIPs();

            logRequest({
               ip: clientIP,
               successfull: false,
               method: req.method,
               url: req.originalUrl,
               userAgent: req.headers["user-agent"] || "unknown",
               blockType: "IP Blocked",
               blockReason: "Exceeded rate-limit violation threshold",
            });

            console.log("Rate limit violation threshold reached");
         }
      } else {
         // Log rate-limit violation without blocking
         logRequest({
            ip: clientIP,
            successfull: false,
            method: req.method,
            url: req.originalUrl,
            userAgent: req.headers["user-agent"] || "unknown",
            blockType: "RateLimit",
            blockReason: "Rate limit hit",
         });
      }

      res.status(429).json({
         message: "Too many requests, please try again later.",
      });
   },
});
