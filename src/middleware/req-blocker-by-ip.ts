import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { logRequest } from "../utils/logger";

interface BlockedIP {
   ip: string;
   blockReason: string;
   blockedUntil: string;
}

// temp storage of blocked ips
const filePath = path.join(__dirname, "../tempStorage/blockedIPs.json");
let blockedIPs: BlockedIP[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const saveBlockedIPs = () => {
   fs.writeFileSync(filePath, JSON.stringify(blockedIPs, null, 2));
};

export const blockRequestsByIP = (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   const clientIP = req.ip!;

   // Filter out expired blocks
   blockedIPs = blockedIPs.filter((blockedIP) => {
      if (new Date(blockedIP.blockedUntil) > new Date()) {
         return true;
      } else {
         return false;
      }
   });

   saveBlockedIPs();

   const blockedIP = blockedIPs.find((block) => block.ip === clientIP);

   if (blockedIP) {
      logRequest({
         timestamp: new Date().toISOString(),
         ip: clientIP,
         method: req.method,
         url: req.originalUrl,
         userAgent: req.headers["user-agent"] || "unknown",
         blockType: "IP blocked",
         blockReason: blockedIP.blockReason,
         remainingRequests: null,
         windowMs: null,
      });

      res.status(403).json({
         message: `Access denied: ${blockedIP.blockReason}`,
      });
   } else {
      next();
   }
};
