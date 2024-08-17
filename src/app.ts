import express, { Request, Response } from "express";
import { blockRequestsByIP } from "./middleware/req-blocker-by-ip";
import { rateLimiter } from "./middleware/rate-limiter";
import { logRequest } from "./logger";

const app = express();
const PORT = 3200;

app.use(blockRequestsByIP);
app.use(rateLimiter);
app.use((req, res, next) => {
   const logEntry = {
      timestamp: new Date().toISOString(),
      ip: req.ip!,
      method: req.method,
      url: req.originalUrl,
      userAgent: req.headers["user-agent"] || "unknown",
      remainingRequests: res.getHeader("X-RateLimit-Remaining") as
         | number
         | null,
      windowMs: res.getHeader("X-RateLimit-Reset") as number | null,
   };

   logRequest(logEntry);
   next();
});

app.get("/", (req: Request, res: Response) => {
   res.send("Welcome to your WAF-protected application!");
});

// Start the server
app.listen(PORT, () => {
   console.log(`Server is running on port`, PORT);
});
