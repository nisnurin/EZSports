// ===== FIREBASE CONFIGURATION =====
// Replace these values with your actual Firebase project config
// Get them from: Firebase Console → Project Settings → Your Apps

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase (only if config is set)
if (firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
  } catch (e) {
    console.warn('Firebase init failed:', e.message);
  }
} else {
  console.warn('⚠️ Firebase not configured. Email auth via backend only.');
  // The app will still work using session-based auth via MongoDB
}