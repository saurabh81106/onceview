import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  ref,
  push,
  onValue,
  set,
  update,
  remove,
  onDisconnect,
} from "firebase/database";
import { v4 as uuid } from "uuid";
import "./App.css";

export default function App() {
  const [code, setCode] = useState("");
  const [room, setRoom] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [userId] = useState(() => localStorage.getItem("userId") || uuid());

  useEffect(() => {
    localStorage.setItem("userId", userId);
  }, [userId]);

  useEffect(() => {
    if (!room) return;
    const timer = setTimeout(() => {
      alert("Session expired. Please enter room code again.");
      setRoom(null);
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [room]);

  const join = () => {
    if (!code) return;
    setRoom(code);

    // Fetch messages
    onValue(ref(db, `rooms/${code}/messages`), (snap) => {
      const val = snap.val();
      setMsgs(val ? Object.values(val) : []);
    });

    // Set online status
    const statusRef = ref(db, `rooms/${code}/status/${userId}`);
    set(statusRef, { online: true, typing: false });

    // On disconnect update to offline and add lastSeen
    onDisconnect(statusRef).update({
      online: false,
      typing: false,
      lastSeen: Date.now(),
    });

    // Fetch all user statuses
    onValue(ref(db, `rooms/${code}/status`), (snap) => {
      setOnlineUsers(snap.val() || {});
    });
  };

  const send = () => {
    if (!room || !msg) return;
    push(ref(db, `rooms/${room}/messages`), {
      text: msg,
      timestamp: Date.now(),
      sender: userId,
    });
    setMsg("");
    update(ref(db, `rooms/${room}/status/${userId}`), {
      typing: false,
    });
  };

  const handleTyping = (e) => {
    setMsg(e.target.value);
    if (!room) return;
    update(ref(db, `rooms/${room}/status/${userId}`), {
      typing: e.target.value.length > 0,
    });
  };

  const deleteChat = () => {
    if (!room) return;
    const confirmDelete = window.confirm("Are you sure you want to delete all chat messages?");
    if (confirmDelete) {
      remove(ref(db, `rooms/${room}/messages`));
    }
  };

  return (
    <div className="app">
      {!room ? (
        <div className="join">
          <h2>Enter Secret Code</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} />
          <button onClick={join}>Join</button>
        </div>
      ) : (
        <div className="chat">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <div className="status-bar">
              {Object.entries(onlineUsers).map(([id, st]) => (
                <div key={id} className="status-item">
                  <span style={{ color: st.online ? "lime" : "gray" }}>●</span>{" "}
                  {id === userId ? "You" : "User"}{" "}
                  {st.typing && id !== userId ? (
                    <em>typing…</em>
                  ) : !st.online && st.lastSeen ? (
                    <em>
                      last seen:{" "}
                      {new Date(st.lastSeen).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </em>
                  ) : null}
                </div>
              ))}
            </div>

            {room && (
              <div className="delete-button-container">
                <button
                  onClick={deleteChat}
                  className="delete-icon"
                  title="Delete Chat"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>

          <div className="messages">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`message ${m.sender === userId ? "me" : "other"}`}
              >
                <strong>{m.sender === userId ? "You" : "User"}:</strong>{" "}
                {m.text}
                <div className="timestamp">
                  {new Date(m.timestamp).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="send">
            <input
              value={msg}
              onChange={handleTyping}
              placeholder="Type your message..."
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
