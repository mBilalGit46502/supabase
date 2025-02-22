import { createClient } from '@supabase/supabase-js';

 class Supabase {
  constructor(config) {
    this.client = createClient(config.url, config.key);
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
  };
}
}

export { Supabase }; 