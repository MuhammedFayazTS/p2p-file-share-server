import express, { Request, Response } from "express";

export const app = express();

// Health check route
app.get("/", (req: Request, res: Response) => {
  res.send("Health Check Successful");
});
