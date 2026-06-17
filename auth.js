const SUPABASE_URL = 'https://ppzljvtnukptmeozvudv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwemxqdnRudWtwdG1lb3p2dWR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2NzU5MTUsImV4cCI6MjA5NzI1MTkxNX0.ctU5jdDow0RcyqGDzpBpCvvAe0a4_l9jQCdZQSdRFrE';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    location.href = 'login.html';
    return null;
  }
  return session;
}

async function signUp(email, password) {
  return await db.auth.signUp({ email, password });
}

async function signIn(email, password) {
  return await db.auth.signInWithPassword({ email, password });
}

async function signOut() {
  await db.auth.signOut();
  location.href = 'login.html';
}

const OAUTH_REDIRECT = 'https://kskyuny.github.io/todo-app/';

async function signInWithGoogle() {
  return await db.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT },
  });
}

async function signInWithGitHub() {
  return await db.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: OAUTH_REDIRECT },
  });
}
