import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

const TOPICS = ['חדשות כללי', 'ספורט', 'כלכלה', 'פוליטיקה', 'אופנה', 'סלבס'];
const DATE_FILTERS = [
  { value: 'all', label: 'כל התאריכים' },
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע האחרון' },
  { value: 'month', label: 'החודש האחרון' },
  { value: 'custom', label: 'תאריך מסוים' },
];
const emptyForm = { siteName: '', siteUrl: '', pageTitle: '', commentId: '', yourComment: '', hint: 'חדשות כללי' };
const themes = [
  { value: 'day', label: 'יום בהיר', swatch: '#f7f8f5' },
  { value: 'midday', label: 'צהריים רך', swatch: '#f5efe2' },
  { value: 'night', label: 'לילה כהה', swatch: '#17212b' },
  { value: 'glow', label: 'רקע זוהר', swatch: '#d8f3e5' },
];
const BADGES = [
  { name: 'מתחיל', min: 0, icon: '○', className: 'beginner' },
  { name: 'מגיב פעיל', min: 1, icon: '✦', className: 'active' },
  { name: 'טוקבקיסט', min: 5, icon: '◆', className: 'commenter' },
  { name: 'טוקבקיסט ותיק', min: 15, icon: '★', className: 'veteran' },
  { name: 'טוקבקיסט על', min: 30, icon: '✹', className: 'super' },
];

function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [convos, setConvos] = useState([]);
  const [topicFilter, setTopicFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [repliesFilter, setRepliesFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRepliesId, setEditingRepliesId] = useState(null);
  const [repliesDraft, setRepliesDraft] = useState('');
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('comment-tracker-theme') || 'day');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [nickname, setNickname] = useState(() => localStorage.getItem('comment-tracker-nickname') || '');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('comment-tracker-theme', nextTheme);
    setShowThemeMenu(false);
  };

  const startNicknameEdit = () => {
    setNicknameDraft(nickname);
    setIsEditingNickname(true);
  };

  const saveNickname = () => {
    const nextNickname = nicknameDraft.trim();
    if (!nextNickname) return;
    setNickname(nextNickname);
    localStorage.setItem('comment-tracker-nickname', nextNickname);
    setIsEditingNickname(false);
  };

  const load = async () => {
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`);
    setConvos(res.data);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.siteName || !form.siteUrl || !form.pageTitle || !form.yourComment || !form.hint) {
      alert('נא למלא את כל השדות המסומנים');
      return;
    }
    try {
      if (editingConversationId) {
        const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/conversations/${editingConversationId}`, form);
        setConvos(previous => previous.map(item => item._id === editingConversationId ? response.data : item));
        setEditingConversationId(null);
        setForm(emptyForm);
        setIsFormOpen(false);
      } else {
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/conversations`, form);
        setForm(emptyForm);
        load();
      }
    } catch (err) {
      console.error('Save conversation error:', err.response?.data || err.message);
      alert(editingConversationId ? 'עדכון הכרטיס נכשל.' : 'שמירת התגובה נכשלה.');
    }
  };

  const startConversationEdit = (conversation) => {
    setEditingConversationId(conversation._id);
    setForm({
      siteName: conversation.siteName || '',
      siteUrl: conversation.siteUrl || '',
      pageTitle: conversation.pageTitle || '',
      commentId: conversation.commentId || '',
      yourComment: conversation.yourComment || '',
      hint: conversation.hint || 'חדשות כללי',
    });
    setIsFormOpen(true);
    document.querySelector('.form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteComment = async (conversation) => {
    if (!window.confirm('למחוק את התגובה השמורה?')) return;
    try {
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/conversations/${conversation._id}`);
      setConvos(previous => previous.filter(item => item._id !== conversation._id));
    } catch (err) {
      console.error('Delete error:', err.response?.data || err.message);
      alert('מחיקת התגובה נכשלה.');
    }
  };

  const startRepliesEdit = (conversation) => {
    setEditingRepliesId(conversation._id);
    setRepliesDraft(String(conversation.repliesCount || 0));
  };

  const updateRepliesCount = async (conversation) => {
    const repliesCount = Number(repliesDraft);
    if (!Number.isInteger(repliesCount) || repliesCount < 0) {
      alert('יש להזין מספר שלם, 0 או יותר.');
      return;
    }
    try {
      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/conversations/${conversation._id}/replies`, { repliesCount });
      setConvos(previous => previous.map(item => item._id === conversation._id ? response.data : item));
      setEditingRepliesId(null);
      setRepliesDraft('');
    } catch (err) {
      console.error('Update replies error:', err.response?.data || err.message);
      alert('עדכון מספר המגיבים נכשל.');
    }
  };

  const filteredConvos = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = dateFilter === 'today'
      ? startOfToday
      : dateFilter === 'week'
        ? new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000)
        : dateFilter === 'month'
          ? new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1)
          : dateFilter === 'custom' && customDate
            ? new Date(`${customDate}T00:00:00`)
            : null;

    return convos.filter((conversation) => {
      const matchesSite = siteFilter === 'all' || conversation.siteName === siteFilter;
      const searchValue = searchText.trim().toLocaleLowerCase();
      const matchesSearch = !searchValue || [conversation.siteName, conversation.pageTitle, conversation.yourComment]
        .some(value => (value || '').toLocaleLowerCase().includes(searchValue));
      const matchesTopic = topicFilter === 'all' || (conversation.hint || 'חדשות כללי') === topicFilter;
      const repliesCount = conversation.repliesCount || 0;
      const matchesReplies = repliesFilter === 'all'
        || (repliesFilter === 'replied' && repliesCount > 0)
        || (repliesFilter === 'unreplied' && repliesCount === 0);
      if (!startDate) return matchesSite && matchesSearch && matchesTopic && matchesReplies;
      const createdAt = new Date(conversation.createdAt);
      const matchesDate = dateFilter === 'custom'
        ? createdAt.toDateString() === startDate.toDateString()
        : createdAt >= startDate;
      return matchesSite && matchesSearch && matchesTopic && matchesReplies && matchesDate;
    });
  }, [convos, siteFilter, searchText, topicFilter, dateFilter, customDate, repliesFilter]);

  const savedSites = [...new Set(convos.map(conversation => conversation.siteName).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'he'));
  const totalReplies = convos.reduce((total, conversation) => total + (conversation.repliesCount || 0), 0);
  const currentBadge = [...BADGES].reverse().find(badge => totalReplies >= badge.min) || BADGES[0];

  return (
    <div className={`app theme-${theme}`} dir="rtl">
      <header className="hero">
        <div className="theme-picker">
          <button className="brand-mark" onClick={() => setShowThemeMenu(!showThemeMenu)} aria-label="בחירת רקע" aria-expanded={showThemeMenu}>CT</button>
          {showThemeMenu && <div className="theme-menu">
            <strong>בחרו אווירה</strong>
            {themes.map(option => <button key={option.value} className={theme === option.value ? 'selected' : ''} onClick={() => changeTheme(option.value)}>
              <span className="theme-swatch" style={{ background: option.swatch }} />{option.label}
            </button>)}
          </div>}
        </div>
        <div>
          <p className="eyebrow">COMMENT TRACKER</p>
          <h1>התגובות שלך, במקום אחד</h1>
          <p className="hero-subtitle">שומרים, מסננים וחוזרים בקלות לכל תגובה חשובה.</p>
        </div>
        <div className="nickname-area">
          {isEditingNickname ? (
            <div className="nickname-editor">
              <input autoFocus value={nicknameDraft} onChange={event => setNicknameDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && saveNickname()} placeholder="הקלידו כינוי" aria-label="כינוי" />
              <button onClick={saveNickname}>שמור</button>
            </div>
          ) : (
            <button className={`nickname-button ${nickname ? 'has-nickname' : ''}`} onClick={nickname ? startNicknameEdit : () => { setNicknameDraft(''); setIsEditingNickname(true); }}>
              {nickname || 'צור כינוי'}
            </button>
          )}
          <div className={`user-badge ${currentBadge.className}`} title={`סה״כ הגיבו לי: ${totalReplies}`}>
            <span className="badge-art" aria-hidden="true">{currentBadge.icon}</span>
            <span className="badge-copy"><strong>{currentBadge.name}</strong><small>{totalReplies} תגובות</small></span>
          </div>
        </div>
        <div className="hero-count"><strong>{convos.length}</strong><span>תגובות שמורות</span></div>
      </header>

      <section className={`card form-card ${editingConversationId ? 'is-editing' : 'is-new'}`}>
        <div className="section-heading">
          <button className="form-toggle" onClick={() => setIsFormOpen(!isFormOpen)} aria-expanded={isFormOpen}>
            <span><span className="section-kicker">{editingConversationId ? 'עדכון כרטיס' : 'שמירה חדשה'}</span><h2>{editingConversationId ? 'עדכן תגובה במעקב' : 'הוסף תגובה למעקב'}</h2></span>
            <span className={`toggle-icon ${isFormOpen ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
          </button>
          <span className="required-note">* שדה חובה</span>
        </div>
        <div className={`form-content ${isFormOpen ? 'is-open' : ''}`}>
          <div className="form-grid">
          <label className="input-field"><span>שם האתר: *</span><input placeholder={editingConversationId ? 'הקלידו שם אתר' : 'שם האתר *'} value={form.siteName} onChange={e => setForm({ ...form, siteName: e.target.value })} /></label>
          <label className="input-field"><span>כתובת האתר: *</span><input placeholder={editingConversationId ? 'הדביקו כתובת כתבה' : 'כתובת האתר *'} value={form.siteUrl} onChange={e => setForm({ ...form, siteUrl: e.target.value })} /></label>
          <label className="input-field"><span>כותרת הכתבה: *</span><input placeholder={editingConversationId ? 'הקלידו כותרת כתבה' : 'כותרת הכתבה *'} value={form.pageTitle} onChange={e => setForm({ ...form, pageTitle: e.target.value })} /></label>
          <label className="input-field"><span>תוכן התגובה: *</span><textarea placeholder={editingConversationId ? 'הדביקו את תוכן התגובה' : 'תוכן התגובה *'} value={form.yourComment} onChange={e => setForm({ ...form, yourComment: e.target.value })} /></label>
          <label className="input-field topic-field"><span>נושא האתר:</span><select id="article-topic" value={form.hint} onChange={e => setForm({ ...form, hint: e.target.value })} aria-label="נושא האתר">
            {TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
          </select></label>
          <label className="input-field"><span>מזהה התגובה:</span><input placeholder={editingConversationId ? 'אופציונלי' : 'מזהה התגובה (אופציונלי)'} value={form.commentId} onChange={e => setForm({ ...form, commentId: e.target.value })} /></label>
          </div>
          <button className="primary-button" onClick={submit}>{editingConversationId ? 'שמור עדכון' : 'שמור תגובה'} <span>←</span></button>
        </div>
      </section>

      <div className="instructions-wrapper">
        <button className="instructions-toggle" onClick={() => setShowInstructions(!showInstructions)} aria-expanded={showInstructions}>
          <span>{showInstructions ? 'הסתר הסבר' : 'איך זה עובד? לחצו להסבר'}</span>
          <span className={`instructions-arrow ${showInstructions ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
        </button>
        {showInstructions && <div className="instructions-text">שמרו תגובה חדשה, לחצו על “פתח וחפש”, ואז:<br />1. מצאו את כפתור התגובות באתר ולחצו עליו.<br />2. תוכן התגובה יועתק אוטומטית. הדביקו אותו בחיפוש בתוך העמוד (באייפון: Find on Page). לפעמים צריך לגלול עוד כדי לטעון תגובות נוספות, ואז התגובה תימצא.<br />3. שמרו כאן כדי לחזור אליה בקלות בכל עת.</div>}
      </div>

      <section className="library-header">
        <div><span className="section-kicker">הספרייה שלך</span><h2>תגובות שמורות <span>{filteredConvos.length}</span></h2></div>
        <button className="filters-toggle" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}>
          <span>{showFilters ? 'מזער חיפוש' : 'חפש וסנן תגובות'}</span>
          <span className={`filters-arrow ${showFilters ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
        </button>
        <div className={`filters-panel ${showFilters ? 'is-open' : ''}`}>
          <div className="filters" aria-label="סינון תגובות">
          <input className="search-filter" type="search" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="חיפוש חופשי..." aria-label="חיפוש חופשי" />
          <select value={siteFilter} onChange={e => setSiteFilter(e.target.value)} aria-label="סינון לפי אתר">
            <option value="all">כל האתרים</option>
            {savedSites.map(site => <option key={site} value={site}>{site}</option>)}
          </select>
          <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} aria-label="סינון לפי נושא">
            <option value="all">כל הנושאים</option>
            {TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} aria-label="סינון לפי תאריך">
            {DATE_FILTERS.map(filter => <option key={filter.value} value={filter.value}>{filter.label}</option>)}
          </select>
          <select value={repliesFilter} onChange={e => setRepliesFilter(e.target.value)} aria-label="סינון לפי הגיבו לי">
            <option value="all">הגיבו לי: הכל</option>
            <option value="replied">הגיבו לי: כן</option>
            <option value="unreplied">הגיבו לי: עדיין לא</option>
          </select>
          {dateFilter === 'custom' && <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} aria-label="בחירת תאריך" />}
          </div>
        </div>
      </section>

      {filteredConvos.length > 0 ? <div className="list">
        {filteredConvos.map(conversation => {
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${conversation.siteUrl}`;
          return (
            <article key={conversation._id} className="conversation">
              <div className="conversation-topline">
                <h3><img src={faviconUrl} alt="" />{conversation.siteName}</h3>
                <span className="topic-tag">{conversation.hint || 'חדשות כללי'}</span>
              </div>
              <p className="page-title">{conversation.pageTitle}</p>
              {conversation.yourComment && <p className="comment-quote">“{conversation.yourComment}”</p>}
              <span className="saved-date">נשמר {new Date(conversation.createdAt).toLocaleDateString('he-IL')}</span>
              <div className="actions">
                <button className="jump-link" onClick={() => { navigator.clipboard.writeText(conversation.yourComment || ''); window.open(`${conversation.siteUrl}#comment-${conversation.commentId}`, '_blank'); }}>פתח וחפש ↗</button>
                <div className="response-tools">
                  <button className="card-update-button" onClick={() => startConversationEdit(conversation)}>עדכן כרטיס</button>
                  <div className="replies-count">
                    <span>הגיבו לי:</span>
                    {editingRepliesId === conversation._id ? (
                      <input className="replies-input" type="number" min="0" value={repliesDraft} onChange={event => setRepliesDraft(event.target.value)} aria-label="מספר המגיבים" />
                    ) : <strong>{conversation.repliesCount || 0}</strong>}
                    <button className="update-replies" onClick={() => editingRepliesId === conversation._id ? updateRepliesCount(conversation) : startRepliesEdit(conversation)}>{editingRepliesId === conversation._id ? 'שמור' : 'עדכן'}</button>
                  </div>
                  <button className="delete-button" onClick={() => deleteComment(conversation)}>מחק</button>
                </div>
              </div>
            </article>
          );
        })}
      </div> : <div className="empty-state"><span>◌</span><h3>{convos.length ? 'אין תוצאות לסינון' : 'עדיין אין תגובות שמורות'}</h3><p>{convos.length ? 'נסו לשנות את הנושא או טווח התאריך.' : 'התגובה הראשונה שלכם מחכה כאן.'}</p></div>}

      <footer className="app-footer">© All rights reserved to Eliran Takiya</footer>
    </div>
  );
}

export default App;
