import { Request } from "express";
import { logRequest } from "../utils/logger";

// click tracker - store IP-based activity
const clickTracker: { [key: string]: { count: number; lastClick: number } } =
   {};

const MAX_CLICKS = 50;
const MINIMUM_CLICK_INTERVAL_MS = 500; // Minimum allowed delay between clicks in ms
const TRACKER_EXPIRATION_TIME = 5000; // reset tracker after some time

const cleanupClickTracker = () => {
   const currentTime = Date.now();
   for (const ip in clickTracker) {
      if (currentTime - clickTracker[ip].lastClick > TRACKER_EXPIRATION_TIME) {
         delete clickTracker[ip];
      }
   }
};

export const validateAdClick = (req: Request) => {
   const ip: string = req.headers["x-forwarded-for"]?.toString() || req.ip!;
   const userAgent = req.headers["user-agent"] || "unknown";
   const currentTime = Date.now();

   // Initialize or update the click tracker for the given IP
   if (!clickTracker[ip]) {
      clickTracker[ip] = {
         count: 1,
         lastClick: currentTime,
      };
   } else {
      const timeSinceLastClick = currentTime - clickTracker[ip].lastClick;

      // Increment count if clicks are too fast, otherwise reset count - to improve this logic (ues circular buffer)
      if (timeSinceLastClick < MINIMUM_CLICK_INTERVAL_MS) {
         clickTracker[ip].count += 1;
      } else {
         clickTracker[ip].count = 1;
      }

      clickTracker[ip].lastClick = currentTime;

      // flag as GIVT if the threshold is reached
      if (clickTracker[ip].count >= MAX_CLICKS) {
         logRequest({
            ip,
            method: req.method,
            url: req.originalUrl,
            userAgent,
            blockType: "Ad Fraud",
            blockReason: "GIVT detected: too many fast clicks",
         });

         return { isBot: true };
      }
   }

   cleanupClickTracker();

   return { isBot: false };
};
