import express, { Request, Response } from "express";
import { blockRequestsByIP } from "./middleware/req-block-by-ip";
import { rateLimiter } from "./middleware/rate-limiter";

const app = express();
const PORT = 3200;

app.use(blockRequestsByIP);
app.use(rateLimiter);

app.get("/", (req: Request, res: Response) => {
   res.send("Welcome to your WAF-protected application!");
});

// Start the server
app.listen(PORT, () => {
   console.log(`Server is running on port`, PORT);
});
