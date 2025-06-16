import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  ref,
  push,
  onValue,
  set,
  update,
  remove,
  get,
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

  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => localStorage.setItem("userId", userId), [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [msgs]);

  const join = () => {
    if (!code.trim()) return;
    setRoom(code.trim());

    onValue(ref(db, `rooms/${code}/messages`), (snap) => {
      const v = snap.val();
      const arr = v ? Object.values(v) : [];
      setMsgs(arr);
    });

    const statusRef = ref(db, `rooms/${code}/status/${userId}`);
    set(statusRef, { online: true, typing: false, lastSeen: Date.now() });
    onDisconnect(statusRef).update({ online: false, typing: false, lastSeen: Date.now() });

    onValue(ref(db, `rooms/${code}/status`), (snap) => setOnlineUsers(snap.val() || {}));
  };

  const limitMessages = async (roomId) => {
    const msgRef = ref(db, `rooms/${roomId}/messages`);
    const snap = await get(msgRef);
    if (!snap.exists()) return;
    const data = snap.val();
    const keys = Object.keys(data);
    if (keys.length > 500) {
      const sorted = keys.sort((a, b) => data[a].timestamp - data[b].timestamp);
      const deleteKey = sorted[0];
      remove(ref(db, `rooms/${roomId}/messages/${deleteKey}`));
    }
  };

  const deleteOldMessages = async (roomId) => {
    const threshold = Date.now() - 72 * 60 * 60 * 1000; // 72 hours
    const msgRef = ref(db, `rooms/${roomId}/messages`);
    const snap = await get(msgRef);
    if (!snap.exists()) return;
    const data = snap.val();
    Object.entries(data).forEach(([key, value]) => {
      if (value.timestamp < threshold) {
        remove(ref(db, `rooms/${roomId}/messages/${key}`));
      }
    });
  };

  const send = () => {
    if (!room || !msg.trim()) return;

    const now = Date.now();
    const id = now.toString();

    const recentMsgs = msgs.filter((m) => m.sender === userId);
    const recent2s = recentMsgs.filter((m) => now - m.timestamp < 1000);
    const recentMin = recentMsgs.filter((m) => now - m.timestamp < 60000);
    if (recent2s.length >= 2 || recentMin.length >= 20) {
      alert("Rate limit exceeded. Max 2/sec and 20/min allowed.");
      return;
    }

    push(ref(db, `rooms/${room}/messages`), {
      id,
      text: msg.trim(),
      timestamp: now,
      sender: userId,
      replyTo: replyTo ? replyTo.id : null,
    });

    setMsg("");
    setReplyTo(null);
    update(ref(db, `rooms/${room}/status/${userId}`), { typing: false });

    limitMessages(room);
    deleteOldMessages(room);
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

  const getTypingUsers = () => {
    return Object.entries(onlineUsers)
      .filter(([id, s]) => id !== userId && s.online && s.typing)
      .map(() => "Someone is typing...");
  };

  return (
    <div className="app">
      {!room ? (
        <div className="join">
          <h2>Enter Premium Code</h2>
          <input type="number" value={code}  onChange={(e) => {
    const val = e.target.value;
    if (/^\d{0,3}$/.test(val)) {
      setCode(val);
    }
  }} placeholder="Enter or Create room No...." maxLength={3} />
          <button onClick={join}>Continue</button>
        </div>
      ) : (
        <div className="chat">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="status-bar">
              {(() => {
                const e = Object.entries(onlineUsers).filter(([id]) => id !== userId);
                const onlineNow = e.filter(([, s]) => s.online);
                const latestOffline = e.filter(([, s]) => !s.online && s.lastSeen).sort((a, b) => b[1].lastSeen - a[1].lastSeen).slice(0, 1);
                const show = [...onlineNow, ...latestOffline];
                return show.map(([id, st]) => (
                  <div key={id} className="status-item">
                    <span style={{ color: st.online ? "lime" : "gray" }}>●</span> User {st.online ? "" : <em>last seen {new Date(st.lastSeen).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true })}</em>}
                  </div>
                ));
              })()}
            </div>
            <div className="delete-button-container">
              <button onClick={deleteChat} className="delete-icon" title="Delete Chat">☠️</button>
            </div>
          </div>

          <div className="messages">
            {msgs.map((m) => (
              <div key={m.id} className={`message ${m.sender === userId ? 'me' : 'other'}`}>
                {m.replyTo && <div className="quote">{getMsgById(m.replyTo)?.text?.slice(0, 60) || 'message'}</div>}
                <strong>{m.sender === userId ? 'You' : 'User👤'}:</strong> {m.text}
                <div className="timestamp">{new Date(m.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                <span
                  className={`reply-icon ${m.sender === userId ? 'left' : 'right'}`}
                  title="Reply"
                  onClick={() => setReplyTo({ id: m.id, text: m.text })}
                >
                  ⤶
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {replyTo && (
            <div className="reply-preview">
              Replying to: {replyTo.text.slice(0, 60)}
              <button onClick={() => setReplyTo(null)} className="cancel-reply">✖</button>
            </div>
          )}

          {/* Typing indicator (bottom like Instagram) */}
          {getTypingUsers().length > 0 && (
            <div className="typing-indicator">
              <em>{getTypingUsers().join(", ")}</em>
            </div>
          )}

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
