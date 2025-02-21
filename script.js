const config = {
  url: 'write project url ',
  key: 'wtite project key',
};

class SupabaseAuth {
  constructor(config) {
    this.client = supabase.createClient(config.url, config.key);
    this.auth = this.client.auth;
    this.storage = this.client.storage;
  }

  // Sign up a new user
  async signup(email, password) {
    try {
      const { data, error } = await this.auth.signUp({ email, password });

      if (error) throw error;

      alert('Successfully Signed Up:', data.user.email);
      return data;
    } catch (e) {
      alert('Unsuccessful Signup. Please try again.', e.message);
      return { error: e.message };
    }
  }

  // Sign in an existing user
  async signin(email, password) {
    try {
      const { data, error } = await this.auth.signInWithPassword({ email, password });

      if (error) throw error;

      alert('User logged in successfully:', data.user.email);
      return data;
    } catch (e) {
      if (e.message.includes('Invalid login credentials')) {
        alert('Error: Email or password is incorrect.');
        return { error: 'Email or password is incorrect. Please try again.' };
      } else {
        alert('Error during login:', e.message);
        return { error: 'An error occurred during login. Please try again.' };
      }
    }
  }

  // Log out the current user
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

async addpost(title, description, file, bucketName) {
  try {
    if (!file) throw new Error("❌ No image file provided.");

    // Step 1: Upload Image
    const uploadResponse = await this.uploadfile(file, bucketName);
    if (uploadResponse.error) throw new Error(`❌ Error uploading image: ${uploadResponse.error}`);

    const imagePath = uploadResponse.filePath;
    if (!imagePath) throw new Error("❌ Image upload failed: No file path returned.");

    // Step 2: Get Public Image URL
    const { data: urlData } = this.storage.from(bucketName).getPublicUrl(imagePath);
    const imageUrl = urlData?.publicUrl;
    if (!imageUrl) throw new Error("❌ Failed to generate public URL for uploaded image.");

    console.log("✅ Image uploaded successfully:", imageUrl);

    // Step 3: Insert Post into Database
    const { data, error } = await this.client
      .from("posts")
      .insert([{ title, description, image_url: imageUrl }]);

    if (error) {
     
     console.error(error.message) 
      
  console.log("⚠️ Table 'posts' does not exist. Please create it manually by running the following SQL query in the Supabase SQL Editor:");

  console.log(`
    CREATE TABLE posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
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

async getpost() {
  try {
    const { data: posts, error } = await this.client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return posts; // Returns the posts data
  } catch (e) {
    console.error("❌ Error fetching posts:", e.message);
    return { error: e.message };
  }
}

async deletePost(postId) {
  try {
    if (!postId) throw new Error("⚠️ Post ID is required.");

    // Delete post from the 'posts' table
    const { error } = await this.client.from("posts").delete().eq("id", postId);

    if (error) throw new Error(error.message);

    console.log("✅ Post deleted successfully!");
    return { success: true, message: "Post deleted successfully!" };
  } catch (e) {
    console.error("❌ Error deleting post:", e.message);
    return { error: e.message };
  }
}


}
const Supabase = new SupabaseAuth(config);




/*

console.log(Supabase)
async function signup() {
  let res= await Supabase.signup("abcd@gmail.com","12345678")
  return res
}
signup()
async function login() {
  let res= await Supabase.signin("abcd@gmail.com","12345678")
  return res
}
login()

async function create() {
  let res= await Supabase.createbucket("assest")
  return res
}

async function file() {
  const fileInput = document.querySelector("#fileinput").files[0];

await Supabase.addpost(
  "My second Post",
  "This is a description of my first post."
 ,fileInput,"images"
);
displayPosts()
}

async function displayPosts() {
  const posts = await Supabase.getpost();
  
  if (posts.error) {
    console.log(posts.error);
    return;
  }

  let content = "";
  posts.forEach((post) => {
    content += `
  <div class="post" id="post-${post.id}">
    <h2>${post.title}</h2>
    <p>${post.description}</p>
    <img src="${post.image_url}" alt="Post Image" style="width: 200px;">
    <button onclick="updatePostHandler('${post.id}')">Update</button>
    <button onclick="deletePostHandler('${post.id}')">Delete</button>
    <hr>
  </div>
`;
  });

  document.getElementById("postsContainer").innerHTML = content;
}

// ✅ Delete Post Functionality
async function deletePostHandler(postId) {
  if (!confirm("Are you sure you want to delete this post?")) return; // Confirmation before deleting

  const deleteResponse = await Supabase.deletePost(postId);

  if (deleteResponse.error) {
    console.log("❌ Error deleting post:", deleteResponse.error);
    return;
  }

  console.log("✅ Post deleted successfully!");
  document.getElementById(`post-${postId}`).remove(); // Remove from DOM
}
onload= function (){
  displayPosts()
}

async function updatePostHandler(postId) {
  try {
    // ✅ Get user input for title & description
    const newTitle = prompt("Enter new title (leave empty to keep the same):") || null;
    const newDescription = prompt("Enter new description (leave empty to keep the same):") || null;

    let newFile = null;
    let imageUrl = null;

    // ✅ Ask if the user wants to update the image
    if (confirm("Do you want to update the image?")) {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      
      await new Promise((resolve) => {
        fileInput.addEventListener("change", () => {
          newFile = fileInput.files[0];
          resolve();
        });
        fileInput.click();
      });

      if (newFile) {
        // ✅ Upload new image
        const uploadResponse = await Supabase.uploadfile(newFile, "your-bucket-name");
        if (uploadResponse.error) throw new Error(uploadResponse.error);

        const imagePath = uploadResponse.filePath;
        if (!imagePath) throw new Error("Image upload failed.");

        // ✅ Get the new public image URL
        const { data: urlData } = Supabase.storage.from("your-bucket-name").getPublicUrl(imagePath);
        imageUrl = urlData?.publicUrl;
        if (!imageUrl) throw new Error("Failed to get public image URL.");
      }
    }

    // ✅ Prepare the update object
    const updateData = {
      ...(newTitle && { title: newTitle }),
      ...(newDescription && { description: newDescription }),
      ...(imageUrl && { image_url: imageUrl })
    };

    // ✅ Update post in Supabase
    const { data, error } = await Supabase.client
      .from("posts")
      .update(updateData)
      .eq("id", postId);

    if (error) throw new Error(error.message);

    console.log("✅ Post updated successfully!");

    // ✅ Update UI dynamically
    const postElement = document.querySelector(`#post-${postId}`);
    if (newTitle) postElement.querySelector("h2").textContent = newTitle;
    if (newDescription) postElement.querySelector("p").textContent = newDescription;
    if (imageUrl) postElement.querySelector("img").src = imageUrl;
    
  } catch (e) {
    console.error("❌ Error updating post:", e.message);
  }
}


//create()
/*
class SupabaseMethods {
  constructor(config) {
    this.client = window.supabase.createClient(config.url, config.key);
    this.auth = this.client.auth;
    this.storage = this.client.storage;
  }

  // Signup method
  async signup(email, password) {
    try {
      const { data, error } = await this.auth.signUp({ email, password });

      if (error) throw error;

      console.log("✅ Signup Successful! Please check your email to verify your account.");
      return { success: true, data };
    } catch (error) {
      console.error("❌ Signup Failed:", error.message);
      return { success: false, message: error.message };
    }
  }

  // Signin method
  async signin(email, password) {
    try {
      const { data, error } = await this.auth.signInWithPassword({ email, password });

      if (error) throw error;

      console.log("✅ Login Successful! Welcome back.");
      return { success: true, data };
    } catch (error) {
      console.error("❌ Login Failed:", error.message);
      return { success: false, message: error.message };
    }
  }

  // Signout method
  async signout() {
    try {
      const { error } = await this.auth.signOut();

      if (error) throw error;

      console.log("✅ Successfully logged out!");
      return { success: true };
    } catch (error) {
      console.error("❌ Signout Failed:", error.message);
      return { success: false, message: error.message };
    }
  }
}

// Initialize Supabase
const Supabase = new SupabaseMethods(config);

// Signup function
async function signupUser() {
  const response = await Supabase.signup("ali@example.com", "password123");

  if (!response.success) {
    console.log("⚠️ Signup Error:", response.message);
  }
}

// Login function
async function loginUser() {
  const response = await Supabase.signin("ali@example.com", "password123");

  if (!response.success) {
    console.log("⚠️ Login Error:", response.message);
  }
}

// Logout function
async function logoutUser() {
  const response = await Supabase.signout();

  if (!response.success) {
    console.log("⚠️ Logout Error:", response.message);
  }
}

// Call functions
//signupUser();
//loginUser();
//setTimeout(logoutUser, 5000); // Logs out after 5 seconds */