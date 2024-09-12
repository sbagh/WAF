import express, { Request, Response } from "express";
import { blockRequestsByIP } from "./middleware/req-blocker-by-ip";
import { rateLimiter } from "./middleware/rate-limiter";
import { logRequest } from "./utils/logger";

const app = express();
const PORT = 3200;

app.use(blockRequestsByIP);
app.use(rateLimiter);
app.use((req, res, next) => {
   // only successful requests reach here
   const remainingRequests = res.getHeader("X-RateLimit-Remaining");
   const resetTime = res.getHeader("X-RateLimit-Reset");

   logRequest({
      ip: req.ip!,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"] || "unknown",
      remainingRequests: remainingRequests
         ? parseInt(remainingRequests as string, 10)
         : null,
      windowMs: resetTime ? parseInt(resetTime as string, 10) : null,
      logLevel: "info",
   });

   next();
});

app.get("/", (req: Request, res: Response) => {
   res.send("Welcome to your WAF-protected application!");
});

app.listen(PORT, () => {
   console.log(`Server is running on port`, PORT);
});
