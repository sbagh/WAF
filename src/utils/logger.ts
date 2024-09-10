import fs from "fs";
import path from "path";

interface LogEntry {
   timestamp: string;
   ip: string;
   method: string;
   url: string;
   userAgent: string;
   blockType?: string;
   blockReason?: string;
   remainingRequests?: number | null;
   windowMs?: number | null;
}

const logFilePath = path.join(__dirname, "../tempStorage/requestLogs.json");

export const logRequest = (logEntry: LogEntry) => {
   let logs = [];

   // check if file exists
   if (fs.existsSync(logFilePath)) {
      const data = fs.readFileSync(logFilePath, "utf-8");
      logs = JSON.parse(data);
   }

   logs.push(logEntry);

   fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
};
