import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken"
import { loadData, saveData } from "./src/db/db.js";
import {finduserByid, finduserByUsername , finduserByEmail } from "./src/utils/user.js";
import { findcommentByid, findpostbyid } from "./src/utils/post.js";


const app = express();
const PORT = process.env.PORTs || 5000;

app.use(express.json());
app.use(cors());
app.use(cookieParser())
app.use(express.urlencoded({ extended: true }));

// small helper
const id = () => crypto.randomUUID();

function protect(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized - No token",
      success: false
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_CODE);

    req.userId = decoded.userId; // attach user to request

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
      success: false
    });
  }
}

//register
app.post("/auth/register", (req, res) => {
  const { name, username, email, password } = req.body;
  if (!name || !username || !email || !password)
    return res
      .status(400)
      .json({ message: "All fields are required", success: false });

  const db = loadData();

  // u.username === username ||

  const existuser = finduserByEmail(email);
  const exitstUsername = finduserByUsername(username)
  if (existuser)
    return res.status(409).json({
      message: "user already registered",
      success: false,
    });

     if(exitstUsername) return res.status(409).json({
      message:"Username already register",
      success:false
    })

  const Newuser = {
    _id: id(),
    username,
    name,
    email,
    password,
     bio: "",
    avatar: "",
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
    createdAt: Date.now(),
  };


   const token = jwt.sign({userId:Newuser._id},process.env.SECRET_CODE);
  
   res.cookie("token", token, {
    httpOnly: true,
    secure: false, // true in production https
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  db.users.push(Newuser);
  saveData(db);

  return res.status(201).json({
    message: "user created successfully",
    success: true,
    user: Newuser,
  });
});

//login
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res
      .status(400)
      .json({ message: "All fields are required", success: false });

  const db = loadData();

  const isRegistered = finduserByEmail(email);

  if (!isRegistered)
    return res.status(409).json({
      message: "User Not registered",
      success: false,
    });

  const machingData = db.users.find((u) => u.email === email && u.password === password );

  if (!machingData)
    return res.status(401).json({
      message: "Email and password invalid",
      success: false,
    });
     
      // 4️⃣ create token
  const token = jwt.sign(
    { userId: machingData._id },
    process.env.SECRET_CODE,
    { expiresIn: "7d" }
  );

  // 5️⃣ set cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // true in production https
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const { password: _, ...safeuser } = machingData;

  return res.status(200).json({
    message: "Login successfully",
    success: true,
    user: safeuser,
  });
});

//forgot Passowrd
app.post("/auth/forgot-password",(req,res)=>{
   
  const {email} = req.body
  if(!email) return res.status(401).json({
    message:"All fields are required",
    success:false
  })

  const db = loadData()
  const user = finduserByEmail(email)

  if(!user) return res.status(404).json({
    message:"user not found",
    success:false
  })
 const otp = Math.floor(100000+Math.random()*900000);

 user.otp = otp
 user.otpexpiry = Date.now() + 5*60*1000 //5 min
  saveData(db);

  // console.log("OTP is",otp);

  res.status(200).json({
    message:"OTP sent to email",
    success:true
  })
  
})

// verify OTP

app.post('/auth/verify-otp', (req, res) => {
  const {email, otp } = req.body;

  if (!emit ||!otp)
    return res.status(400).json({
      message: "All fields are required",
      success: false
    });

  const db = loadData();

  const user = finduserByEmail(email);

  if (!user)
    return res.status(404).json({ message: "User not found" });

  if (user.otp != otp)
    return res.status(401).json({ message: "Invalid OTP" });

  if (Date.now() > user.otpexpiry)
    return res.status(401).json({ message: "OTP expired" });

  // ✅ CREATE TEMP RESET TOKEN HERE
  const resetToken = jwt.sign(
    { userId: user._id },
    process.env.SECRET_CODE,
    { expiresIn: "10m" } // short life
  );

  res.cookie("resetToken", resetToken, {
    httpOnly: true
  });

  return res.status(200).json({
    message: "OTP verified",
    success: true
  });
});


// Reset Password
app.post("/auth/reset-password", (req, res) => {

  const { newPassword } = req.body;

  const token = req.cookies.resetToken;

  if (!token)
    return res.status(401).json({ message: "Unauthorized" });

  const db = loadData();

  try {
    const decoded = jwt.verify(token, process.env.SECRET_CODE);

    const user = finduserByid(decoded.userId);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.password = newPassword;

    delete user.otp;
    delete user.otpexpiry;

    saveData(db);

    res.clearCookie("resetToken");

    return res.status(200).json({
      message: "Password updated successfully",
      success: true
    });

  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

//Logout
app.post("/auth/logout", protect,(req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});


app.get("/user/:username",protect ,(req, res) => {
  const username = req.params.username;

  const db = loadData();

  const findUser = db.users.find(u => u.username === username);

  if (!findUser) {
    return res.status(404).json({
      message: "User not found",
      success: false
    });
  }

  const { password: _, otp, otpexpiry, ...safeuser } = findUser;

  return res.status(200).json({
    message: "User fetched successfully",
    success: true,
    user: safeuser
  });
});

app.get('/profile/me', protect, (req,res)=>{
  
  const db = loadData()

  const user = finduserByid(req.userId)

   if (!user)
    return res.status(404).json({
      message: "User not found",
      success: false
    });
    const {password:_ , ...safeuser} = user

     res.status(200).json({
      message:"user data fetching successfully",
    success: true,
    user: safeuser
  });

})

//update user detais
app.put('/user/profile/edit' ,protect ,(req,res)=>{
  const {username , name  , bio , avatar } = req.body

   const db = loadData();
  const user = finduserByid(req.userId)

  if (!user)
    return res.status(404).json({ message: "User not found" });

  if (name) user.name = name;
  if (username) user.username = username;
  if (bio) user.bio = bio;
  if (avatar) user.avatar = avatar;

  saveData(db);

  const { password: _, ...safeUser } = user;

  res.json({
    message: "Profile updated",
    user: safeUser
  });

})

app.post('/post/like/:postId', protect,(req,res)=>{

  const postId = req.params.postId
  const userId = req.userId
   const db = loadData()
  const user = finduserByid(userId)

     const post = findpostbyid(postId)
     if(!post) return res.status(404).json({
      message:"Post not found",
      success:false
     })
       post.likesCount+=1;
   if (!user)
    return res.status(404).json({
      message: "user not found",
      success: false
    });

     const already = db.likes.find(
    (l) => l.userId === userId && l.postId === postId
  );

  if (already) return res.status(400).json({
    message:"Already liked",
  });

  db.likes.push({ _id: id(), userId, postId });


  

  saveData(db);

  return res.status(200).json({
    message:"Like Added ✅"
  });

})

app.get('/post/get-post',protect, (req,res)=>{
  const db = loadData()

  if(db.posts.length < 0) return res.status(404).json({
    message:"no post",
    success:false
  })
   return res.status(200).json({
    message:"post fetching successfully",
    success:true,
    post:db.posts,
    comment:db.comments,
    likes:db.likes
   });
})

app.post('/post/create', (req,res)=>{
  const {caption} = req.body

  const token = req.cookies.token
  if(!token) return res.status(401).json({
    message:"Unauthorized user",
    success:false
  })

  const db = loadData()
  try {
    const decoded = jwt.verify(token , process.env.SECRET_CODE)
    const user = finduserByid(decoded.userId)

   if (!user)
      return res.status(404).json({ message: "User not found" });

   const createPost = {
    _id:id(),
    userId:decoded.userId,
    caption,
    likesCount: 0,
    commentsCount:0,
    createdAt: Date.now(),

   }
   db.posts.push(createPost)
   saveData(db)

   return res.status(201).json({
    message:"post created successfully",
    success:true,
    post:createPost
   })
    
  } catch (error) {
     return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
      error
    });
    
  }
})

app.post('/post/comment/:postid',(req,res)=>{
  const token = req.cookies.token
  if(!token) return res.status(401).json({
    message:"Unauthorized user",
    success:false
  })

  const {text} = req.body

  if(!text) return res.status(400).json({
    message:"Comment is required",
    success:false
  })


const db = loadData()
const postid = req.params.postid

try {
  const decoded = jwt.verify(token , process.env.SECRET_CODE);
  const user = finduserByid(decoded.userId)

if(!user) return res.status(404).json({
  message:" user not found",
  success:false
})
const post = findpostbyid(postid)

if(!post) return res.status(404).json({
  message:"post not found",
  success:false
})

 const Addcomment = {
  _id:id(),
  userID:decoded.userId,
  postID:postid,
  comments:text,
  replies:[],
  createdAt: Date.now(),
 }
 db.comments.push(Addcomment);
 post.commentsCount+=1;

   saveData(db);

   return res.status(201).json({
    message:"Comment added successfully",
    success:true
   })

  
} catch (error) {
   return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
      error
    });
}
})

app.post('/post/comment/reply/:commentId' , (req,res)=>{

  const token = req.cookies.token
 const {reply}= req.body
 if(!reply) return res.status(400).json({
  message:"reply text required"
 }) 

  if(!token) return res.status(401).json({
    message:"Unauthorized User",
    success:false
  })
  const db = loadData();

  try {
       const decoded = jwt.verify(token, process.env.SECRET_CODE);

    const user = finduserByid(decoded.userId);
    if(!user) return res.status(404).json({
      message:"user not found",
      success:false
    })

  const comment = findcommentByid(req.params.commentId)

  if(!comment) return res.status(404).json({
    message:"comment not found",
    success:false
  })
  
   const addReply = {
    _id:id(),
    userId:decoded.userId,
    replies:[],
    createdAt:Date.now()
   }

   comment.reply.push(addReply)
   saveData(db)

   return res.status(201).json({
    message:"Reply Added",
    success:true
   })

  } catch (error) {
     return res.status(401).json({
      message: "Invalid or expired token",
      success: false,
      error
    });
  }
})

//RUNNING
app.listen(PORT, () => {
  console.log(`App is Runing on port ${PORT}`);
});
