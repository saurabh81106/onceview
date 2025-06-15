import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyD1INDy7FOVboMYtaZjZ2L5yljcLl6TjDE",
  authDomain: "onceview-2d93b.firebaseapp.com",
  databaseURL: "https://onceview-2d93b-default-rtdb.firebaseio.com",
  projectId: "onceview-2d93b",
  storageBucket: "onceview-2d93b.appspot.com",
  messagingSenderId: "899878473646",
  appId: "1:899878473646:web:659228dfd70cd6e570c23f",
  measurementId: "G-RV8DWSC40H"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
