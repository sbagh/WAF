import fs from "fs";
import path from "path";

interface LogEntry {
   timestamp: string;
   successfull: boolean;
   ip: string;
   xForwardedFor: string | null;
   method: string;
   url: string;
   userAgent: string;
   blockType: string | null;
   blockReason: string | null;
   remainingRequests: number | null;
   windowMs: number | null;
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
      successfull: entry.successfull || true,
      ip: entry.ip || "unknown",
      xForwardedFor: entry.xForwardedFor || null,
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
