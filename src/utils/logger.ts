import fs from "fs";
import path from "path";

interface LogEntry {
   timestamp: string;
   ip: string;
   method: string;
   url: string;
   userAgent: string;
   blockType: string | null;
   blockReason: string | null;
   remainingRequests: number | null;
   windowMs: number | null;
   logLevel: "info" | "warn" | "error";
}

const logFilePath = path.join(__dirname, "../tempStorage/requestLogs.json");

export const logRequest = (entry: Partial<LogEntry>) => {
   let logs = [];

   // Check if file exists
   if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, "utf-8");
      logs = JSON.parse(data);
   }

   // Default log values
   const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      logLevel: entry.logLevel || "info",
      ip: entry.ip || "unknown",
      method: entry.method || "unknown",
      url: entry.url || "unknown",
      userAgent: entry.userAgent || "unknown",
      blockReason: entry.blockReason || null,
      blockType: entry.blockType || null,
      remainingRequests: entry.remainingRequests || null,
      windowMs: entry.windowMs || null,
   };

   logs.push(logEntry);

   fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
};
