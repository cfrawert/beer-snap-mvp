const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const assetDir = path.join(__dirname, "assets");

const seedUsers = [
  {
    email: "maya@beer-snap.dev",
    password: "password123",
    handle: "maya-pours",
    displayName: "Maya Brewer",
    bio: "Chasing clean pours and crisp lagers.",
    status: "active"
  },
  {
    email: "leo@beer-snap.dev",
    password: "password123",
    handle: "leo-lager",
    displayName: "Leo Lager",
    bio: "Patio beers, pub lights, latest-first energy.",
    status: "active"
  },
  {
    email: "nova@beer-snap.dev",
    password: "password123",
    handle: "nova-stout",
    displayName: "Nova Stout",
    bio: "Dark pours, loud neon, zero captions.",
    status: "active"
  },
  {
    email: "admin@beer-snap.dev",
    password: "password123",
    handle: "tap-admin",
    displayName: "Beer Snap Admin",
    bio: "Moderation queue and local QA account.",
    status: "admin"
  }
];

const cleanupEmails = [
  "maya@beer-snap.dev",
  "leo@beer-snap.dev",
  "nova@beer-snap.dev",
  "admin@beer-snap.dev",
  "taster1@beer-snap.dev",
  "taster2@beer-snap.dev"
];

const follows = [
  ["maya@beer-snap.dev", "leo@beer-snap.dev"],
  ["maya@beer-snap.dev", "nova@beer-snap.dev"],
  ["leo@beer-snap.dev", "maya@beer-snap.dev"],
  ["nova@beer-snap.dev", "maya@beer-snap.dev"]
];

const hoursAgo = (hours) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

const postFixtures = [
  {
    key: "sunlit-pils",
    email: "leo@beer-snap.dev",
    imagePath: "seed/sunlit-pils.jpg",
    createdAt: hoursAgo(0.5)
  },
  {
    key: "midnight-stout",
    email: "nova@beer-snap.dev",
    imagePath: "seed/midnight-stout.jpg",
    createdAt: hoursAgo(1.5)
  },
  {
    key: "afterwork-amber",
    email: "maya@beer-snap.dev",
    imagePath: "seed/afterwork-amber.jpg",
    createdAt: hoursAgo(3)
  },
  {
    key: "patio-lager",
    email: "leo@beer-snap.dev",
    imagePath: "seed/patio-lager.jpg",
    createdAt: hoursAgo(8)
  },
  {
    key: "taproom-haze",
    email: "maya@beer-snap.dev",
    imagePath: "seed/taproom-haze.jpg",
    createdAt: hoursAgo(22)
  },
  {
    key: "barrel-porter",
    email: "nova@beer-snap.dev",
    imagePath: "seed/barrel-porter.jpg",
    createdAt: hoursAgo(30)
  }
];

const reactionFixtures = [
  ["maya@beer-snap.dev", "sunlit-pils", "like"],
  ["nova@beer-snap.dev", "sunlit-pils", "like"],
  ["admin@beer-snap.dev", "sunlit-pils", "like"],
  ["maya@beer-snap.dev", "midnight-stout", "like"],
  ["leo@beer-snap.dev", "midnight-stout", "like"],
  ["leo@beer-snap.dev", "afterwork-amber", "like"],
  ["nova@beer-snap.dev", "afterwork-amber", "dislike"],
  ["maya@beer-snap.dev", "patio-lager", "like"],
  ["admin@beer-snap.dev", "taproom-haze", "like"]
];

const assertNoError = (error, message) => {
  if (error) {
    throw new Error(`${message}: ${error.message}`);
  }
};

const listAllUsers = async () => {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 200
    });
    assertNoError(error, "Failed to list auth users");

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < 200) break;
    page += 1;
  }

  return users;
};

const cleanupExistingSeedUsers = async () => {
  const existingUsers = await listAllUsers();
  const toDelete = existingUsers.filter((user) =>
    cleanupEmails.includes(user.email ?? "")
  );

  for (const user of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    assertNoError(error, `Failed to delete existing seed user ${user.email}`);
  }

  return toDelete.length;
};

const createSeedUsers = async () => {
  const usersByEmail = new Map();

  for (const seedUser of seedUsers) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: seedUser.email,
      password: seedUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: seedUser.displayName
      }
    });
    assertNoError(error, `Failed to create user ${seedUser.email}`);

    if (!data?.user) {
      throw new Error(`Supabase did not return a user for ${seedUser.email}`);
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({
        handle: seedUser.handle,
        display_name: seedUser.displayName,
        bio: seedUser.bio,
        status: seedUser.status
      })
      .eq("id", data.user.id);
    assertNoError(profileError, `Failed to update profile for ${seedUser.email}`);

    usersByEmail.set(seedUser.email, data.user);
  }

  return usersByEmail;
};

const uploadAssets = async () => {
  const files = (await fs.readdir(assetDir))
    .filter((file) => file.endsWith(".jpg"))
    .sort();

  if (files.length === 0) {
    throw new Error(`No seed images found in ${assetDir}`);
  }

  for (const file of files) {
    const fileBuffer = await fs.readFile(path.join(assetDir, file));
    const { error } = await supabase.storage.from("posts").upload(`seed/${file}`, fileBuffer, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: true
    });
    assertNoError(error, `Failed to upload ${file}`);
  }

  return files;
};

const createFollowGraph = async (usersByEmail) => {
  const rows = follows.map(([followerEmail, followedEmail]) => ({
    follower_user_id: usersByEmail.get(followerEmail).id,
    followed_user_id: usersByEmail.get(followedEmail).id
  }));

  const { error } = await supabase.from("follows").insert(rows);
  assertNoError(error, "Failed to insert follows");
};

const createPosts = async (usersByEmail) => {
  const rows = postFixtures.map((fixture) => ({
    user_id: usersByEmail.get(fixture.email).id,
    image_path: fixture.imagePath,
    image_width: 1080,
    image_height: 1350,
    created_at: fixture.createdAt,
    visibility: "public",
    moderation_status: "approved"
  }));

  const { data, error } = await supabase
    .from("posts")
    .insert(rows)
    .select("id, user_id, image_path");
  assertNoError(error, "Failed to insert posts");

  const postsByKey = new Map();
  for (let index = 0; index < postFixtures.length; index += 1) {
    postsByKey.set(postFixtures[index].key, data[index]);
  }

  return postsByKey;
};

const createReactions = async (usersByEmail, postsByKey) => {
  const rows = reactionFixtures.map(([email, postKey, reaction]) => ({
    user_id: usersByEmail.get(email).id,
    post_id: postsByKey.get(postKey).id,
    reaction
  }));

  const { error } = await supabase.from("post_reactions").insert(rows);
  assertNoError(error, "Failed to insert reactions");
};

const createReport = async (usersByEmail, postsByKey) => {
  const { error } = await supabase.from("reports").insert({
    reporter_user_id: usersByEmail.get("maya@beer-snap.dev").id,
    target_type: "post",
    target_post_id: postsByKey.get("patio-lager").id,
    reason_code: "not_beer",
    note: "Intentional local-dev report to populate the admin queue.",
    status: "open"
  });
  assertNoError(error, "Failed to insert report");
};

const run = async () => {
  const deletedUsers = await cleanupExistingSeedUsers();
  const usersByEmail = await createSeedUsers();
  const uploadedFiles = await uploadAssets();

  await createFollowGraph(usersByEmail);
  const postsByKey = await createPosts(usersByEmail);
  await createReactions(usersByEmail, postsByKey);
  await createReport(usersByEmail, postsByKey);

  console.log("Local Beer Snap fixtures loaded.");
  console.log(`Deleted old seed users: ${deletedUsers}`);
  console.log(`Uploaded images: ${uploadedFiles.length}`);
  console.log("Test accounts:");
  for (const user of seedUsers) {
    console.log(`- ${user.email} (${user.handle})`);
  }
  console.log("Use the in-app magic-link flow to sign in as one of the seeded users.");
  console.log("Recommended first account: maya@beer-snap.dev");
  console.log("Admin account: admin@beer-snap.dev");
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
