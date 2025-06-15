import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, push, onValue } from "firebase/database";
import "./App.css";

export default function App() {
  const [code, setCode] = useState("");
  const [room, setRoom] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState([]);

  const join = () => {
    if (!code) return;
    setRoom(code);
    const r = ref(db, "rooms/" + code);
    onValue(r, snap => {
      const d = snap.val();
      setMsgs(d ? Object.values(d) : []);
    });
  };

  const send = () => {
    if (!room || !msg) return;
    const r = ref(db, "rooms/" + room);
    push(r, { text: msg, timestamp: Date.now() });
    setMsg("");
  };

  return (
    <div className="app">
      {!room ? (
        <div className="join">
          <h2>Enter Secret Code</h2>
          <input value={code} onChange={e => setCode(e.target.value)} />
          <button onClick={join}>Join</button>
        </div>
      ) : (
        <div className="chat">
          <h2>Room: {room}</h2>
          <div className="messages">
            {msgs.map((m,i) => <div key={i} className="message">{m.text}</div>)}
          </div>
          <div className="send">
            <input value={msg} onChange={e => setMsg(e.target.value)} />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
