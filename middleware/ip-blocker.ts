import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

export { blockRequestsByIP };

interface BlockedIP {
   ip: string;
   reason: string;
}

// temp storage of blocked ips
const filePath = path.join(__dirname, "../tempStore/blockedIPs.json");
const blockedIPs: BlockedIP[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

const blockRequestsByIP = (req: Request, res: Response, next: NextFunction) => {
   const clientIP = req.ip;

   const blockedIP = blockedIPs.find((block) => block.ip === clientIP);

   if (blockedIP) {
      res.status(403).json({
         message: `Access denied: ${blockedIP.reason}`,
      });
   } else {
      next();
   }
};
