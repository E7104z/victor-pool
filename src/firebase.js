import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyAWgnWrBSNMXH-tb8Ur-4ft_H6xbiFrpIs",
  authDomain: "pool-league-fccad.firebaseapp.com",
  projectId: "pool-league-fccad",
  storageBucket: "pool-league-fccad.firebasestorage.app",
  messagingSenderId: "600516605128",
  appId: "1:600516605128:web:a4680b1421b920151361fd",
  measurementId: "G-ET410JQQYP"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
