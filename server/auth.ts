import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import createMemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const MemoryStore = createMemoryStore(session);
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000 // 24 hours
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'secret-key-placeholder',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: 'Invalid username or password' });
        }
        
        // Update the last login timestamp
        if (user.id) {
          await storage.updateUserLastLogin(user.id);
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request received:", JSON.stringify(req.body, null, 2));
      const { username, password, email, fullName } = req.body;
      
      if (!username || !password) {
        console.log("Missing required fields: username or password");
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      console.log("Checking if username exists:", username);
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        console.log("Username already exists");
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email is already in use
      if (email) {
        console.log("Checking if email exists:", email);
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          console.log("Email already in use");
          return res.status(400).json({ message: "Email already in use" });
        }
      }
      
      // Create the user
      console.log("Creating user with:", { username, email, fullName });
      const hashedPassword = await hashPassword(password);
      console.log("Password hashed successfully");
      
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        fullName: fullName || null
      });
      
      console.log("User created successfully:", user.id);

      // Log the user in
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in user after registration:", err);
          return next(err);
        }
        console.log("User logged in successfully");
        return res.status(201).json({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ message: "An error occurred during registration" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    console.log("Login request received:", JSON.stringify(req.body, null, 2));
    
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Authentication failed, no user found:", info?.message || "Authentication failed");
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      console.log("User authenticated, attempting login:", user.id);
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Error during login session creation:", loginErr);
          return next(loginErr);
        }
        
        console.log("Login successful for user:", user.id);
        return res.json({
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Current user endpoint
  app.get("/api/user", (req, res) => {
    console.log("GET /api/user called, isAuthenticated:", req.isAuthenticated());
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user;
    console.log("Returning user data:", {
      id: user.id,
      username: user.username
    });
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      githubUsername: user.githubUsername
    });
  });

  // Update user profile
  app.patch("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { email, fullName, githubUsername, githubToken } = req.body;
      
      if (!req.user?.id) {
        return res.status(400).json({ message: "Invalid user session" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(req.user.id, {
        email,
        fullName,
        githubUsername,
        githubToken
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        githubUsername: updatedUser.githubUsername
      });
    } catch (error) {
      console.error("User update error:", error);
      return res.status(500).json({ message: "An error occurred updating user profile" });
    }
  });

  // Change password
  app.post("/api/user/change-password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!req.user?.id) {
        return res.status(400).json({ message: "Invalid user session" });
      }
      
      // Get the current user
      const user = await storage.getUser(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      // Update the password
      const updatedUser = await storage.updateUserPassword(user.id, await hashPassword(newPassword));
      
      if (!updatedUser) {
        return res.status(404).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password change error:", error);
      return res.status(500).json({ message: "An error occurred changing password" });
    }
  });

  // GitHub token validation
  app.post("/api/user/verify-github-token", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "No token provided" });
      }
      
      // Test the token by making a GitHub API request
      const { Octokit } = await import('octokit');
      const octokit = new Octokit({ auth: token });
      
      try {
        const { data } = await octokit.rest.users.getAuthenticated();
        
        return res.json({
          valid: true,
          githubUsername: data.login,
          githubUserDetails: {
            id: data.id,
            name: data.name,
            url: data.html_url,
            avatar: data.avatar_url
          }
        });
      } catch (githubError: any) {
        return res.status(400).json({
          valid: false,
          message: githubError.message || "Invalid GitHub token"
        });
      }
    } catch (error) {
      console.error("GitHub token verification error:", error);
      return res.status(500).json({ message: "An error occurred verifying GitHub token" });
    }
  });
}