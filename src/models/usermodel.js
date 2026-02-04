// ============================================
// 📄 models/social.model.js
// Social App Models using memory.json
// ============================================

import { loadData, saveData } from "../db/db.js";
import crypto from "crypto";

// small helper
const id = () => crypto.randomUUID();


// ============================
// 👤 USER
// ============================

export const createUser = (name) => {
  const db = loadData();

  const user = {
    id: id(),
    name,
    createdAt: Date.now(),
  };

  db.users.push(user);
  saveData(db);

  return user;
};


// ============================
// 📝 POST
// ============================

export const createPost = (userId, content) => {
  const db = loadData();

  const post = {
    id: id(),
    userId,
    content,
    likes: [{userId}],
    createdAt: Date.now(),
  };

  db.posts.push(post);
  saveData(db);

  return post;
};

export const getAllPosts = () => {
  const db = loadData();
  return db.posts;
};


// ============================
// ❤️ LIKE
// ============================

export const likePost = (userId, postId) => {
  const db = loadData();

  // prevent double like
  const already = db.likes.find(
    (l) => l.userId === userId && l.postId === postId
  );

  if (already) return "Already liked";

  db.likes.push({ id: id(), userId, postId });

  const post = db.posts.find((p) => p.id === postId);
  if (post) post.likes++;

  saveData(db);

  return "Liked";
};


// ============================
// 💬 COMMENT
// ============================

export const addComment = (userId, postId, text) => {
  const db = loadData();

  const comment = {
    id: id(),
    userId,
    postId,
    text,
    createdAt: Date.now(),
  };

  db.comments.push(comment);

  saveData(db);

  return comment;
};
