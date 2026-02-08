import { loadData } from "../db/db.js"


export const findpostbyid = (id) =>{
  const db = loadData()
  return db.posts.find((p)=>p._id === id)
}

export const findcommentByid = (id) =>{
  const db = loadData()
 return db.comments.find((c)=>c._id === id)
}