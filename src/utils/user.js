import { loadData } from "../db/db.js"

export const finduserByEmail = (email) =>{
  const db = loadData()
  return db.users.find((u)=>u.email === email )
}

export const finduserByid = (id) =>{
  const db = loadData()
  return db.users.find((u)=>u._id === id )
}

export const finduserByUsername = (username) =>{
  const db = loadData()
  return db.users.find((u)=>u.username === username)
}

