/*import { createClient } from '@supabase/supabase-js'
*/
const config = {
  url: 'https://htdgrfrykkpftvpfucby.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0ZGdyZnJ5a2twZnR2cGZ1Y2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxMjMwOTMsImV4cCI6MjA1NTY5OTA5M30.OL8MrCypni4qI2LswKvQcxWiX_dM7R1Ome6ARQT18es',
  
};


 class Supabaseauth {
  constructor(config) {
    this.client = supabase.createClient(config.url, config.key);
    this.auth = this.client.auth;
    this.storage = this.client.storage;
    this.secretKey = "bilal"; //
    
  }

  
  async signup(usernameOrEmail, emailOrPassword, passwordInput) {
  try {
    let username, email, password, secretKey;
    
    // 🔹 Handle cases dynamically
    if (passwordInput) {
      // If all three arguments are provided: username, email, and password
      username = usernameOrEmail?.trim();
      email = emailOrPassword?.trim();
      password = passwordInput;
    } else {
      // If only email and password are provided, derive the username
      email = usernameOrEmail?.trim();
      password = emailOrPassword;
      username = email.split("@")[0]; // Extract first part of email as username
    }
    
    // 🔹 Check for admin using a secret key
    [password, secretKey] = password.includes("|") ? password.split("|") : [password, null];
    secretKey = secretKey ? secretKey.trim() : null;
    const isAdmin = secretKey === this.secretKey;
    
    // 🔹 Sign up the user
    const { data, error } = await this.auth.signUp({ email, password });
    
    if (error) {
      if (error.message.includes("User already registered")) {
        console.warn(`⚠️ User already exists: ${email}`);
        return;
      }
      throw error;
    }
    
    if (!data?.user) {
      console.error("❌ ERROR: Could not retrieve user ID.");
      return;
    }
    
    const userId = data.user.id;
    console.log("✅ User Created Successfully");
    
    // 🔹 Insert user into "users" table
    const { error: insertError } = await this.client
      .from("users")
      .insert([{ id: userId, email, username, is_admin: isAdmin }]); // Now includes username
    
    if (insertError) {
      console.error("⚠️ Error inserting user into 'users' table:", insertError.message);
      console.warn("⚠️ 'users' table may not exist or missing columns! Please run the following SQL query manually in Supabase SQL Editor:");
      console.log(`
        -- ✅ Create or update the 'users' table with 'username' column
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE, -- Added username column (optional)
    is_admin BOOLEAN DEFAULT FALSE
);

-- ✅ If the table already exists, add the 'username' column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
      `);
      return;
    }
    
    console.log(isAdmin ? "✅ Admin Created Successfully" : "✅ Regular User Created Successfully");
  } catch (error) {
    console.error("Signup Error:", error.message);
  }
}

async signin(email, password) {
  try {
    // 🔹 Attempt to sign in
    const { data, error } = await this.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error("❌ Sign-in failed:", error.message);
      return null;
    }
    
    console.log("✅ User signed in successfully:", email);
    
    // 🔹 Fetch authenticated user data
    const { data: userData, error: authError } = await this.auth.getUser();
    if (authError || !userData?.user) {
      console.warn("⚠️ Unable to retrieve authenticated user data.");
      return null;
    }
    
    const userId = userData.user.id;
    
    // 🔹 Fetch `is_admin` column from users table
    const { data: userRoleData, error: roleError } = await this.client
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .single();
    
    if (roleError || !userRoleData) {
      console.warn("⚠️ User role not found. Assuming regular user.");
      return { ...userData.user, is_admin: false };
    }
    
    console.log(userRoleData.is_admin ? "👑 Admin logged in." : "👤 Regular user logged in.");
    
    // 🔹 Return user data with `is_admin` status
    return { ...userData.user, is_admin: userRoleData.is_admin };
  } catch (error) {
    console.error("❌ ERROR: Sign-in failed:", error.message);
    return null;
  }
}

    // ✅ Fetch User Role
    async getuser() {
    try {
        await this.auth.refreshSession();
        const { data: userData, error: authError } = await this.auth.getUser();

        if (authError || !userData?.user) {
            console.warn("⚠️ No user is currently signed in. Please log in first.");
            return null;
        }

        const userId = userData.user.id;

        // 🔹 Fetch `is_admin` from users table
        const { data: userRoleData, error: roleError } = await this.client
            .from("users")
            .select("is_admin")
            .eq("id", userId)
            .single();

        if (roleError || !userRoleData) {
            console.warn("⚠️ User role not found, assuming regular user.");
            return { ...userData.user, is_admin: false };
        }

        return { ...userData.user, is_admin: userRoleData.is_admin };
    } catch (error) {
        console.error("❌ ERROR Fetching User Role:", error.message);
        return null;
    }
}

// ✅ Setup
  async signout() {
    try {
      const { error } = await this.auth.signOut();
      if (error) throw error;

      alert('User logged out successfully');
      return { success: true };
    } catch (e) {
      alert('Error during logout:', e.message);
      return { error: e.message };
    }
  }

 
  async getsession() {
    try {
      const { data: { session }, error } = await this.auth.getSession();

      if (error) throw error;

      if (session) {
        alert('User is already logged in:', session.user.email);
        return session;
      } else {
        alert('No active session found.');
        return { error: 'No active session found. Please log in.' };
      }
    } catch (e) {
      alert('Error checking session:', e.message);
      return { error: e.message };
    }
  }
  
  
  async createbucket(bucketName) {
  try {
    // Step 1: Create bucket
    let { data, error } = await this.storage.createBucket(bucketName, { public: true });

    // Step 2: If RLS policy error occurs, notify user
    if (error && error.message.includes("violates row-level security policy")) {
      alert(`❌ Bucket "${bucketName}" requires an RLS policy. Plz check the console for resolving the issue`);
      console.log("⚠️ Go to Supabase SQL Editor and run the following SQL query:");

      console.log(`
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all authenticated users to create buckets"
ON storage.buckets
FOR INSERT
WITH CHECK(auth.role() = 'authenticated');
        `);
      return { error: "RLS policy missing. Please add manually via SQL Editor." };
    }

    if (error) throw error;
    console.log(`✅ Bucket "${bucketName}" created successfully!`, data);
    return data;
  } catch (e) {
    console.log("Bucket Creation Error:", e.message);
    return { error: e.message };
  }
}

  async uploadfile(file, bucketName) {
  try {
    if (!file) {
      throw new Error('No file provided for upload.');
    }

    
    const uniqueFileName = `${crypto.randomUUID()}-${file.name}`;

    const { data, error } = await this.storage
      .from(bucketName)
      .upload(`public/${uniqueFileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    console.log('File uploaded successfully:', data);
    return { success: true, filePath: data.path };
  } catch (e) {
    console.log('Error uploading file:', e.message);
    return { error: e.message };
  }
}

async addpost(title, description, fileImage, bucketName) {
        try {
            const user = this.getuser();
            if (!user) {
                throw new Error("User not authenticated");
            }

            // Upload image to the specified bucket
            if (!fileImage) throw new Error("❌ No image file provided.");

// Step 1: Upload Image
const uploadResponse = await this.uploadfile(fileImage, bucketName);
if (uploadResponse.error) throw new Error(`❌ Error uploading image: ${uploadResponse.error}`);

const imagePath = uploadResponse.filePath;
if (!imagePath) throw new Error("❌ Image upload failed: No file path returned.");

// Step 2: Get Public Image URL
const { data: urlData } = this.storage.from(bucketName).getPublicUrl(imagePath);
const imageUrl = urlData?.publicUrl;
if (!imageUrl) throw new Error("❌ Failed to generate public URL for uploaded image.");

console.log("✅ Image uploaded successfully:", imageUrl);
            // Insert post into the database
            const { data, error } = await this.client
                .from("posts")
                .insert([
                    {
                        title: title,
                        description: description, // Store the description exactly as entered
                        image_url: imageUrl,
                        user_id: user.id,
                        created_at: new Date()
                    }
                ]);

            if (error) {
     
     console.error(error.message) 
      
  console.log("⚠️ Table 'posts' does not exist. Please create it manually by running the following SQL query in the Supabase SQL Editor:");

  console.log(`
    CREATE TABLE posts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);
  `);
      throw new Error(error.message || "Unknown error occurred.");
    }

    console.log("✅ Post added successfully!");
    return data;

  } catch (e) {
    console.error(" Error:", e.message || "Unknown error occurred.");
    return { error: e.message || "Unknown error occurred." };
  }
    }

    // Method to fetch posts and preserve description formatting
    async getposts() {
        try {
            const { data: posts, error } = await this.client
                .from("posts")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            return posts.map(post => ({
                ...post,
                description: post.description.replace(/\n/g, "<br>") // Preserve user formatting
            }));
        } catch (error) {
            console.error("❌ Error fetching posts:", error.message);
            return [];
        }
    }

async deletePost(postId, imageUrl) {
    try {
        if (!postId) throw new Error("⚠️ Post ID is required.");
        if (!imageUrl) throw new Error("⚠️ Image URL is required.");

        // Extract image path from URL (Supabase storage public URL structure)
        const imagePath = imageUrl.split("/storage/v1/object/public/")[1]; // Extract relative path

        if (!imagePath) throw new Error("⚠️ Image path extraction failed.");

        const bucketName = imagePath.split("/")[0]; // Extract bucket name dynamically

        // Delete image from Supabase Storage
        const { error: storageError } = await this.storage
            .from(bucketName)
            .remove([imagePath.replace(bucketName + "/", "")]); // Remove bucket name from path

        if (storageError) throw new Error(`Failed to delete image: ${storageError.message}`);

        // Delete post from 'posts' table
        const { error: dbError } = await this.client
            .from("posts")
            .delete()
            .eq("id", postId);

        if (dbError) throw new Error(dbError.message);

        console.log("✅ Post and image deleted successfully!");

        // Remove the post element from the UI
        document.querySelector(`[data-id="${postId}"]`).parentElement.remove();

        return { success: true, message: "Post and image deleted successfully!" };
    } catch (e) {
        console.error("❌ Error deleting post:", e.message);
        return { error: e.message };
    }
}








}



const Supabase = new Supabaseauth(config);


document.getElementById("postForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const fileImage = document.getElementById("fileImage").files[0];

    if (!title || !description || !fileImage) {
        alert("All fields are required!");
        return;
    }

    await Supabase.addpost(title, description, fileImage, "images"); // Replace with your Supabase bucket

    document.getElementById("postForm").reset();
    loadPosts();
});

// Load Posts
async function loadPosts() {
    const postsContainer = document.getElementById("postsContainer");
    postsContainer.innerHTML = "<p>Loading...</p>";

    const posts = await Supabase.getposts();
    postsContainer.innerHTML = "";

    posts.forEach(post => {
    const postElement = document.createElement("div");
    postElement.classList.add("post");

    postElement.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.description}</p>
        <img src="${post.image_url}" alt="Post Image">
        <p><small>Posted at: ${new Date(post.created_at).toLocaleString()}</small></p>
        <button class="delete-btn" data-id="${post.id}" data-image="${post.image_url}">🗑 Delete</button>
    `;

    postsContainer.appendChild(postElement);
});

// Add event listeners to all delete buttons
document.querySelectorAll(".delete-btn").forEach(button => {
    button.addEventListener("click", async function () {
        const postId = this.getAttribute("data-id");
        const imageUrl = this.getAttribute("data-image");
        await Supabase.deletePost(postId, imageUrl);
    });
});
}

// Load posts on page load
window.onload = loadPosts;


/*
// ✅ Test Cases
//Supabase.signup("fsfsrfdf@example.com", "password123"); // Regular user
//Supabase.signup("adgi@example.com", "password123", "bilal"); // Admin user

// logout()
    
// ✅ Show user-specific content
async function showUserContent() {
    const user = await Supabase.getuser();
    if (!user) {
        console.error("❌ Error: Unable to fetch user data.");
        return;
    }

    const adminContent = document.getElementById("admin-content");
    const userContent = document.getElementById("user-content");

    if (user.is_admin) {
        console.log("👑 Admin User - Showing admin content.");
        adminContent.style.display = "block";
        userContent.style.display = "none";
    } else {
        console.log("👤 Regular User - Showing user content.");
        userContent.style.display = "block";
        adminContent.style.display = "none";
    }
}
async function login() {
const user = await Supabase.signin("abc@gmail.com", "12345678");

if (user) {
    if (user.is_admin) {
        console.log("👑 Welcome, Admin!");
    } else {
        console.log("👤 Welcome, Regular User!");
    }
} else {
    console.error("❌ Sign-in failed.");
}
}
//login ()
// 🔹 Call on page load
document.addEventListener("DOMContentLoaded", showUserContent);
document.getElementById("signup-form").addEventListener("submit", async (event) => {
            event.preventDefault();

            const email = document.getElementById("email").value;
            const passwordInput = document.getElementById("password").value;

            await Supabase.signup("jani",email, passwordInput);
        });

async function logout() {
        await Supabase.signout();
        console.log("✅ User logged out.");
    }*/