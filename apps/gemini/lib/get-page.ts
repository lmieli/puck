import type { Data } from "@puckeditor/core";
import fs from "fs";
import { defaultPages } from "./default-pages";

// Published pages live in database.json (written by /puck/api). Pages that were
// never published fall back to the initial content in default-pages.ts.
// Replace with calls to your database in production.
export const getPage = (path: string): Data | null => {
  const saved: Record<string, Data> = fs.existsSync("database.json")
    ? JSON.parse(fs.readFileSync("database.json", "utf-8"))
    : {};

  return saved[path] ?? defaultPages[path] ?? null;
};

export const getAllPaths = () => {
  const saved: Record<string, Data> = fs.existsSync("database.json")
    ? JSON.parse(fs.readFileSync("database.json", "utf-8"))
    : {};

  return Array.from(
    new Set([...Object.keys(defaultPages), ...Object.keys(saved)])
  );
};
