import express, { Request, Response } from "express";
import { blockRequestsByIP } from "./middleware/req-blocker-by-ip";
import { rateLimiter } from "./middleware/rate-limiter";
import { validateAdClick } from "./middleware/ad-defender";
import { logRequest } from "./utils/logger";
import { log } from "console";

const app = express();
const PORT = 3200;

app.use(blockRequestsByIP);
app.use(rateLimiter);
app.use((req, res, next) => {
   // only successful requests reach here
   const remainingRequests = res.getHeader("X-RateLimit-Remaining");
   const resetTime = res.getHeader("X-RateLimit-Reset");
   const xHeaders = req.headers["x-forwarded-for"];

   logRequest({
      ip: req.ip!,
      xForwardedFor: xHeaders ? xHeaders.toString() : null,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"] || "unknown",
      remainingRequests: remainingRequests
         ? parseInt(remainingRequests as string, 10)
         : null,
      windowMs: resetTime ? parseInt(resetTime as string, 10) : null,
   });

   next();
});

app.get("/", (req: Request, res: Response) => {
   res.send("Welcome to your WAF-protected application!");
});

app.get("/ad-click", (req: Request, res: Response) => {
   const validateClick = validateAdClick(req);

   if (validateClick.isBot) {
      res.status(403).json({
         message: "Bot detected: GIVT, click rejected.",
      });
   } else {
      res.status(200).json({
         message: "Click successful",
      });
   }
});

app.listen(PORT, () => {
   console.log(`Server is running on port`, PORT);
});
