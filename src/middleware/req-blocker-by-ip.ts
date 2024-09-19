import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { logRequest } from "../utils/logger";

interface BlockedIP {
   ip: string;
   blockReason: string;
   blockedUntil: string;
}

const blockedIpsPath = path.join(__dirname, "../tempStorage/blockedIPs.json");

// load blocked IPs dynamically to avoid stale data
const loadBlockedIPs = (): BlockedIP[] => {
   try {
      const data = fs.readFileSync(blockedIpsPath, "utf-8");
      return JSON.parse(data);
   } catch (err) {
      console.error("Error reading blockedIPs.json:", err);
      return [];
   }
};

// Save blocked IPs to the JSON file
const saveBlockedIPs = (blockedIPs: BlockedIP[]): void => {
   try {
      fs.writeFileSync(blockedIpsPath, JSON.stringify(blockedIPs, null, 2));
   } catch (err) {
      console.error("Error writing to blockedIPs.json:", err);
   }
};

export const blockRequestsByIP = (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   const clientIP = req.ip!;
   let blockedIPs = loadBlockedIPs();

   // filter out expired IPs
   blockedIPs = blockedIPs.filter((blockedIP) => {
      if (new Date(blockedIP.blockedUntil) > new Date()) {
         return true;
      } else {
         console.log(
            `IP ${blockedIP.ip} unblocked, block expired at ${blockedIP.blockedUntil}`
         );
         return false;
      }
   });

   // Save any changes back to the file
   saveBlockedIPs(blockedIPs);

   const xHeaders = req.headers["x-forwarded-for"];

   // Check if client IP is blocked
   const blockedIP = blockedIPs.find((block) => block.ip === clientIP);
   if (blockedIP) {
      logRequest({
         timestamp: new Date().toISOString(),
         successfull: false,
         ip: clientIP,
         xForwardedFor: xHeaders ? xHeaders.toString() : null,
         method: req.method,
         url: req.originalUrl,
         userAgent: req.headers["user-agent"] || "unknown",
         blockType: "IP blocked",
         blockReason: blockedIP.blockReason,
         remainingRequests: null,
         windowMs: null,
      });

      return res.status(403).json({
         message: `Access denied: ${blockedIP.blockReason}`,
      });
   }

   // If not blocked, continue to next middleware
   next();
};
