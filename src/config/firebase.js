// ─────────────────────────────────────────────────────────────────────────────
// STEP: Replace the values below with YOUR Firebase project config.
//
// How to get these:
//   1. Go to https://console.firebase.google.com
//   2. Create a project (or open existing one)
//   3. Click the gear icon → Project Settings → General
//   4. Scroll to "Your apps" → Web app → Copy the firebaseConfig object
//   5. Paste the values here
//
// Also enable these in Firebase Console:
//   • Firestore Database (Build → Firestore Database → Create database)
//   • Storage           (Build → Storage → Get started)
//   • Set Firestore rules to allow read/write (for now):
//       rules_version = '2';
//       service cloud.firestore {
//         match /databases/{database}/documents {
//           match /{document=**} {
//             allow read, write: if true;
//           }
//         }
//       }
//   • Set Storage rules to allow read/write:
//       rules_version = '2';
//       service firebase.storage {
//         match /b/{bucket}/o {
//           match /{allPaths=**} {
//             allow read, write: if true;
//           }
//         }
//       }
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyApjrMxVktq9GRSHokZgiyQLRbnFV5lXjQ",
  authDomain: "eclectica-2k26-2ca96.firebaseapp.com",
  projectId: "eclectica-2k26-2ca96",
  storageBucket: "eclectica-2k26-2ca96.firebasestorage.app",
  messagingSenderId: "141804307798",
  appId: "1:141804307798:web:a0c553a8918425434d02f7"
};

const app = initializeApp(firebaseConfig);

export const db      = getFirestore(app);
export const storage = getStorage(app);

// Import the functions you need from the SDKs you need
// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//   apiKey: "AIzaSyAcUFucFyghNDjW1k_nGm3K_YioffiB2BA",
//   authDomain: "eclectica-2k26.firebaseapp.com",
//   projectId: "eclectica-2k26",
//   storageBucket: "eclectica-2k26.firebasestorage.app",
//   messagingSenderId: "766349734348",
//   appId: "1:766349734348:web:86e4b5ceee834c5dc8ed69",
//   measurementId: "G-5YY6T4JB8W"
// };

// Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);