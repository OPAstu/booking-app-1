// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCygd-f5z45Eqrr6xDZLt4OkiG3KctpvIA",
  authDomain: "reserve-system-836e7.firebaseapp.com",
  projectId: "reserve-system-836e7",
  storageBucket: "reserve-system-836e7.appspot.com",
  messagingSenderId: "338254084986",
  appId: "1:338254084986:web:2076b6dedc9dbb7d2cb4c3",
  measurementId: "G-NQHX1P7JK9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
