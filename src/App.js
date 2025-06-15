import React, { useState, useEffect, useRef } from "react";
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
  const [replyTo, setReplyTo] = useState(null);
  const [userId] = useState(() => localStorage.getItem("userId") || uuid());

  /* 🔽 ref for auto‑scroll */
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => localStorage.setItem("userId", userId), [userId]);

  /* auto‑logout after 10 min */
  useEffect(() => {
    if (!room) return;
    const t = setTimeout(() => {
      alert("Session expired. Please enter room code again.");
      setRoom(null);
    }, 10 * 60 * 1000);
    return () => clearTimeout(t);
  }, [room]);

  /* 👇 scroll whenever msgs change */
  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  const join = () => {
    if (!code.trim()) return;
    setRoom(code.trim());

    onValue(ref(db, `rooms/${code}/messages`), (snap) => {
      const v = snap.val();
      setMsgs(v ? Object.values(v) : []);
    });

    const statusRef = ref(db, `rooms/${code}/status/${userId}`);
    set(statusRef, { online: true, typing: false, lastSeen: Date.now() });
    onDisconnect(statusRef).update({ online: false, typing: false, lastSeen: Date.now() });

    onValue(ref(db, `rooms/${code}/status`), (snap) => setOnlineUsers(snap.val() || {}));
  };

  const send = () => {
    if (!room || !msg.trim()) return;
    const id = Date.now().toString();
    push(ref(db, `rooms/${room}/messages`), {
      id,
      text: msg.trim(),
      timestamp: Date.now(),
      sender: userId,
      replyTo: replyTo ? replyTo.id : null,
    });
    setMsg("");
    setReplyTo(null);
    update(ref(db, `rooms/${room}/status/${userId}`), { typing: false });
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
    if (window.confirm("Are you sure you want to delete all chat messages?")) {
      remove(ref(db, `rooms/${room}/messages`));
    }
  };

  const getMsgById = (id) => msgs.find((m) => m.id === id);

  return (
    <div className="app">
      {!room ? (
        <div className="join">
          <h2>Enter Premium Code</h2>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code..." />
          <button onClick={join}>Continue</button>
        </div>
      ) : (
        <div className="chat">
          {/* status + delete */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="status-bar">
              {(() => {
                const e = Object.entries(onlineUsers).filter(([id]) => id !== userId);
                const onlineNow = e.filter(([, s]) => s.online);
                const latestOffline = e.filter(([, s]) => !s.online && s.lastSeen).sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, 1);
                const show = [...onlineNow, ...latestOffline];
                return show.map(([id, st]) => (
                  <div key={id} className="status-item">
                    <span style={{ color: st.online ? "lime" : "gray" }}>●</span> User {st.typing && st.online ? <em>typing…</em> : !st.online ? <em>last seen {new Date(st.lastSeen).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</em> : null}
                  </div>
                ));
              })()}
            </div>
            <div className="delete-button-container">
              <button onClick={deleteChat} className="delete-icon" title="Delete Chat">🗑️</button>
            </div>
          </div>

          {/* messages */}
          <div className="messages">
            {msgs.map((m) => (
              <div key={m.id} className={`message ${m.sender === userId ? 'me' : 'other'}`}>
                {m.replyTo && <div className="quote">{getMsgById(m.replyTo)?.text?.slice(0,60) || 'message'}</div>}
                <strong>{m.sender === userId ? 'You' : 'User'}:</strong> {m.text}
                <div className="timestamp">{new Date(m.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true })}</div>
                <span style={{ marginLeft: 6, cursor: 'pointer' }} title="Reply" onClick={() => setReplyTo({ id: m.id, text: m.text })}>↩️</span>
              </div>
            ))}
            {/* 🔚 invisible element to keep scroll at bottom */}
            <div ref={messagesEndRef} />
          </div>

          {/* reply preview */}
          {replyTo && (
            <div className="reply-preview">
              Replying to: {replyTo.text.slice(0, 60)}
              <button onClick={() => setReplyTo(null)} className="cancel-reply">❌</button>
            </div>
          )}

          {/* send bar */}
          <div className="send">
            <textarea
              value={msg}
              onChange={handleTyping}
              placeholder="Type your message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button onClick={send}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
