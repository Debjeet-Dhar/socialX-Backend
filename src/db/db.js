
// ============================================
// 📄 db/db.js
// File Database Engine (memory.json)
// ============================================

import fs from "fs";
import path from "path";

const DB_PATH = path.resolve("src/db/memory.json");

const defaultData = {
  users: [],
  posts: [],
  likes: [],
  comments: [],
};

// LOAD
export const loadData = () => {
  try {
    // if file doesn't exist → create it
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2));
      return defaultData;
    }

    const raw = fs.readFileSync(DB_PATH);
    return JSON.parse(raw);
  } catch (err) {
    console.log("DB load error:", err);
    return defaultData;
  }
};

// SAVE
export const saveData = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};
