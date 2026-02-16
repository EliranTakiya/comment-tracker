import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';


function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [siteColors, setSiteColors] = useState({}); // store colors for each site
  const [form, setForm] = useState({
    siteName: '',
    siteUrl: '',
    pageTitle: '',
    commentId: '',
    yourComment: '',
    hint: '',
  });

  const [convos, setConvos] = useState([]);

  const load = async () => {
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`);
    setConvos(res.data);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.siteName || !form.siteUrl || !form.pageTitle || !form.commentId) {
      alert('Fill all fields');
      return;
    }
    await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`, form);
    setForm({ siteName: '', siteUrl: '', pageTitle: '', commentId: '', yourComment: '', hint: '' });
    load();
  };
 
  const deleteComment = async (c) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
  
    try {
      console.log(c._id)
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/conversations/${c._id}`);
      setConvos(prev => prev.filter(item => item._id !== c._id));
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      alert('Failed to delete the conversation.');
    }
  };
  
  
  
  

  const openComment = (c) => {
    const url = `${c.siteUrl}#comment-${c.commentId}`;
    window.open(url, '_blank');
  };

  return (
    <div className="app">
      <h1>💬 Comment Tracker</h1>

      <div className="card">
        <input
          placeholder="Site Name*"
          value={form.siteName}
          onChange={e => setForm({ ...form, siteName: e.target.value })}
        />

        <input
          placeholder="Site URL (post page)*"
          value={form.siteUrl}
          onChange={e => setForm({ ...form, siteUrl: e.target.value })}
        />
        <input
          placeholder="Page Title*"
          value={form.pageTitle}
          onChange={e => setForm({ ...form, pageTitle: e.target.value })}
        />


        <input
          placeholder="Your Comment ID*"
          value={form.commentId}
          onChange={e => setForm({ ...form, commentId: e.target.value })}
        />

        <textarea
          placeholder="Your comment text*"
          value={form.yourComment}
          onChange={e => setForm({ ...form, yourComment: e.target.value })}
        />
        <input
          placeholder="Hint (optional)"
          value={form.hint}
          onChange={e => setForm({ ...form, hint: e.target.value })}
        />

        <button onClick={submit}>Save Conversation</button>
      </div>
      <div className="instructions-wrapper">
        <button
          className="instructions-toggle"
          onClick={() => setShowInstructions(!showInstructions)}
        >
          How to track
        </button>

        {showInstructions && (
          <div className="instructions-text">
            1. Find the "comment" button on the site and click it<br></br>
            2. use page search (Ctrl+F / Cmd+F on Windows or find on page on Mobile)<br></br>
            3. paste your comment and track it!
          </div>
        )}
      </div>


      {/* <h2>Your Conversations</h2> */}
      {convos.length > 0 ? (
  <h2 style={{ fontSize: '1.8rem', color: '#2c3e50', marginBottom: '16px' }}>
    Your Conversations
  </h2>
) : (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f0f4ff',       // soft pastel blue
      color: '#4c8bf5',            // matching text color
      fontSize: '1.5rem',
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      gap: '10px'
    }}
  >
    <span style={{ fontSize: '1.8rem' }}>💬</span>
    No Conversations Yet
  </div>
)}


      <div className="list">
      <div className="list">
  {convos.map((c) => {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${c.siteUrl}`;

    return (
      <div
        key={c._id}
        className="conversation"
        style={{
          background: '#fdfdfd',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {/* Site Name with favicon */}
        <h3
          style={{
            margin: '0 0 8px 0',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.35rem',
            fontWeight: '600',
          }}
        >
          {/* Favicon icon */}
          <img
            src={faviconUrl}
            alt="favicon"
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '4px',
            }}
          />
          {c.siteName}
        </h3>

        {/* Page Title */}
        {c.pageTitle && (
          <div style={{ marginBottom: '8px' }}>
            <strong
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#1a3e72',
                marginBottom: '2px',
              }}
            >
              Page Title:
            </strong>
            <p
              style={{
                background: '#eef6ff',
                padding: '6px 10px',
                borderRadius: '6px',
                margin: 0,
                color: '#1a3e72',
              }}
            >
              {c.pageTitle}
            </p>
          </div>
        )}

        {/* Your Comment */}
        {c.yourComment && (
          <div style={{ marginBottom: '8px' }}>
            <strong
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: '#5a3e00',
                marginBottom: '2px',
              }}
            >
              Your Comment:
            </strong>
            <p
              style={{
                background: '#fff8e1',
                padding: '8px 12px',
                borderRadius: '6px',
                margin: 0,
                color: '#5a3e00',
              }}
            >
              {c.yourComment}
            </p>
          </div>
        )}

        {/* Hint */}
        {c.hint && (
          <p style={{ fontStyle: 'italic', color: '#555', marginTop: '4px' }}>
            Hint: {c.hint}
          </p>
        )}

        {/* Actions */}
        <div className="actions" style={{ marginTop: '10px' }}>
          <button
            className="jump-link"
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#4c8bf5',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'background 0.2s',
            }}
            onClick={() => {
              navigator.clipboard.writeText(c.yourComment);
              window.open(c.siteUrl, '_blank');
            }}
          >
            Open & Fast Find ↗
          </button>

          <button
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: '#e74c3c',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: '500',
              marginLeft: '10px',
            }}
            onClick={() => deleteComment(c)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  })}
</div>

</div>


    </div>
  );
}

export default App;