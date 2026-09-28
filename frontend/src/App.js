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
  { name: 'מגיב פעיל', min: 20, icon: '✦', className: 'active' },
  { name: 'טוקבקיסט', min: 60, icon: '◆', className: 'commenter' },
  { name: 'טוקבקיסט ותיק', min: 150, icon: '★', className: 'veteran' },
  { name: 'טוקבקיסט על', min: 300, icon: '✹', className: 'super' },
];

function App() {
  const [showInstructions, setShowInstructions] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [convos, setConvos] = useState([]);
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogDraft, setBlogDraft] = useState({ title: '', content: '' });
  const [blogCommentDrafts, setBlogCommentDrafts] = useState({});
  const [blogActivity, setBlogActivity] = useState({ blogPostsCount: 0, blogCommentsReceived: 0, blogLikesCount: 0, blogDislikesCount: 0 });
  const [blogActivityDraft, setBlogActivityDraft] = useState({ blogPostsCount: '0', blogCommentsReceived: '0', blogLikesCount: '0', blogDislikesCount: '0' });
  const [topicFilter, setTopicFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [repliesFilter, setRepliesFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRepliesId, setEditingRepliesId] = useState(null);
  const [repliesDraft, setRepliesDraft] = useState('');
  const [editingReactionsId, setEditingReactionsId] = useState(null);
  const [reactionsDraft, setReactionsDraft] = useState({ likesCount: '0', dislikesCount: '0' });
  const [statisticsTopicFilter, setStatisticsTopicFilter] = useState('all');
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

  const loadBlogPosts = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/blog-posts`);
      setBlogPosts(response.data);
    } catch (err) {
      console.error('Load blog posts error:', err.response?.data || err.message);
    }
  };

  const loadBlogActivity = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/profile-stats`);
      const activity = { blogPostsCount: 0, blogCommentsReceived: 0, blogLikesCount: 0, blogDislikesCount: 0, ...response.data };
      setBlogActivity(activity);
      setBlogActivityDraft(Object.fromEntries(Object.entries(activity).filter(([key]) => key !== '_id' && key !== 'key' && key !== '__v').map(([key, value]) => [key, String(value)])));
    } catch (err) {
      console.error('Load blog activity error:', err.response?.data || err.message);
    }
  };

  useEffect(() => { load(); loadBlogActivity(); loadBlogPosts(); }, []);

  const createBlogPost = async (event) => {
    event.preventDefault();
    const title = blogDraft.title.trim();
    const content = blogDraft.content.trim();
    if (!title || !content) return;
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/blog-posts`, { title, content });
      setBlogPosts(previous => [response.data, ...previous]);
      setBlogDraft({ title: '', content: '' });
    } catch (err) {
      console.error('Create blog post error:', err.response?.data || err.message);
      alert('שמירת הפוסט נכשלה.');
    }
  };

  const deleteBlogPost = async (post) => {
    if (!window.confirm('למחוק את הפוסט ואת התגובות שלו?')) return;
    try {
      await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/blog-posts/${post._id}`);
      setBlogPosts(previous => previous.filter(item => item._id !== post._id));
    } catch (err) {
      console.error('Delete blog post error:', err.response?.data || err.message);
      alert('מחיקת הפוסט נכשלה.');
    }
  };

  const addBlogComment = async (post) => {
    const draft = blogCommentDrafts[post._id] || { author: '', content: '' };
    const author = draft.author.trim();
    const content = draft.content.trim();
    if (!author || !content) return;
    try {
      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/blog-posts/${post._id}/comments`, { author, content });
      setBlogPosts(previous => previous.map(item => item._id === post._id ? response.data : item));
      setBlogCommentDrafts(previous => ({ ...previous, [post._id]: { author: '', content: '' } }));
    } catch (err) {
      console.error('Add blog comment error:', err.response?.data || err.message);
      alert('שמירת התגובה נכשלה.');
    }
  };

  const saveBlogActivity = async () => {
    const values = {
      ...Object.fromEntries(Object.entries(blogActivityDraft).map(([key, value]) => [key, Number(value)])),
      blogPostsCount: blogPosts.length,
      blogCommentsReceived: blogCommentsCount,
    };
    if (Object.values(values).some(value => !Number.isInteger(value) || value < 0)) {
      alert('יש להזין מספרים שלמים, 0 או יותר.');
      return;
    }
    try {
      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/profile-stats`, values);
      const saved = { ...values, ...response.data };
      setBlogActivity(saved);
      setBlogActivityDraft(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])));
    } catch (err) {
      console.error('Save blog activity error:', err.response?.data || err.message);
      alert('שמירת פעילות הבלוג נכשלה.');
    }
  };

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

  const startReactionsEdit = (conversation) => {
    setEditingReactionsId(conversation._id);
    setReactionsDraft({ likesCount: String(conversation.likesCount || 0), dislikesCount: String(conversation.dislikesCount || 0) });
  };

  const updateReactions = async (conversation) => {
    const likesCount = Number(reactionsDraft.likesCount);
    const dislikesCount = Number(reactionsDraft.dislikesCount);
    if (![likesCount, dislikesCount].every(count => Number.isInteger(count) && count >= 0)) {
      alert('יש להזין מספרים שלמים, 0 או יותר.');
      return;
    }
    try {
      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/conversations/${conversation._id}/reactions`, { likesCount, dislikesCount });
      setConvos(previous => previous.map(item => item._id === conversation._id ? response.data : item));
      setEditingReactionsId(null);
    } catch (err) {
      console.error('Update reactions error:', err.response?.data || err.message);
      alert('עדכון הלייקים והדיסלייקים נכשל.');
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
  const totalCommentLikes = convos.reduce((total, conversation) => total + (conversation.likesCount || 0), 0);
  const totalCommentDislikes = convos.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0);
  const pointsFromSavedComments = convos.length;
  const pointsFromCommentLikes = totalCommentLikes * 2;
  const pointsFromCommentDislikes = totalCommentDislikes * -2;
  const blogCommentsCount = blogPosts.reduce((total, post) => total + (post.comments?.length || 0), 0);
  const pointsFromBlogPosts = blogPosts.length * 5;
  const pointsFromBlogComments = blogCommentsCount * 2;
  const pointsFromBlogLikes = blogActivity.blogLikesCount * 2;
  const pointsFromBlogDislikes = blogActivity.blogDislikesCount * -2;
  const rawPoints = pointsFromSavedComments + pointsFromCommentLikes + pointsFromCommentDislikes
    + pointsFromBlogPosts + pointsFromBlogComments + pointsFromBlogLikes + pointsFromBlogDislikes;
  const totalPoints = Math.max(0, rawPoints);
  const badgeThresholds = [0, 20, 60, 150, 300];
  const currentBadgeIndex = badgeThresholds.reduce((result, threshold, index) => totalPoints >= threshold ? index : result, 0);
  const currentBadge = BADGES[currentBadgeIndex];
  const nextBadge = BADGES[currentBadgeIndex + 1] ? { ...BADGES[currentBadgeIndex + 1], min: badgeThresholds[currentBadgeIndex + 1] } : null;
  const currentBadgeMin = badgeThresholds[currentBadgeIndex];
  const badgeProgress = nextBadge
    ? Math.round(((totalPoints - currentBadgeMin) / (nextBadge.min - currentBadgeMin)) * 100)
    : 100;
  const statisticsConvos = statisticsTopicFilter === 'all'
    ? convos
    : convos.filter(conversation => (conversation.hint || TOPICS[0]) === statisticsTopicFilter);
  const statisticsSites = [...new Set(statisticsConvos.map(conversation => conversation.siteName).filter(Boolean))];
  const repliedConversations = statisticsConvos.filter(conversation => (conversation.repliesCount || 0) > 0).length;
  const siteStats = Object.entries(statisticsConvos.reduce((stats, conversation) => {
    const site = conversation.siteName || 'ללא שם';
    stats[site] = (stats[site] || 0) + 1;
    return stats;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topSiteCount = siteStats[0]?.[1] || 1;
  const totalLikes = statisticsConvos.reduce((total, conversation) => total + (conversation.likesCount || 0), 0);
  const totalDislikes = statisticsConvos.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0);
  const statisticsReplies = statisticsConvos.reduce((total, conversation) => total + (conversation.repliesCount || 0), 0);

  return (
    <div className={`app theme-${theme}`} dir="rtl">
      <header className="hero" id="home">
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
          <div className={`user-badge ${currentBadge.className}`} title={`ניקוד ההתקדמות שלי: ${totalPoints}`}>
            <span className="badge-art" aria-hidden="true">{currentBadge.icon}</span>
            <span className="badge-copy"><strong>{currentBadge.name}</strong><small>{totalPoints} נקודות</small></span>
          </div>
        </div>
        <div className="hero-count"><strong>{convos.length}</strong><span>תגובות שמורות</span></div>
      </header>

      <nav className="main-nav" aria-label="ניווט ראשי">
        <a href="#home">ראשי</a><a href="#comments">התגובות שלי</a><a href="#statistics">הסטטיסטיקות שלי</a><a href="#progress">ההתקדמות שלי</a><a href="#blog">הבלוג שלי</a>
      </nav>

      <section className="statistics-section" id="statistics" aria-labelledby="statistics-title">
        <div className="statistics-heading"><div><span className="section-kicker">המספרים שלך</span><h2 id="statistics-title">הסטטיסטיקות שלי</h2></div><span className="statistics-period">כל התקופה</span></div>
        <label className="statistics-filter">סוג אתר<select value={statisticsTopicFilter} onChange={event => setStatisticsTopicFilter(event.target.value)} aria-label="סינון סטטיסטיקות לפי סוג אתר"><option value="all">כל סוגי האתרים</option>{TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}</select></label>
        <div className="statistics-cards">
          <article className="stat-card"><span>תגובות ששמרתי</span><strong>{statisticsConvos.length}</strong><small>{statisticsTopicFilter === 'all' ? 'בכל סוגי האתרים' : statisticsTopicFilter}</small></article>
          <article className="stat-card"><span>תגובות שקיבלו מענה</span><strong>{repliedConversations}</strong><small>מתוך {statisticsConvos.length} תגובות</small></article>
          <article className="stat-card"><span>תגובות שקיבלתי</span><strong>{statisticsReplies}</strong><small>סך כל המגיבים</small></article>
          <article className="stat-card"><span>לייקים שקיבלתי</span><strong>{totalLikes}</strong><small>בכל התגובות השמורות</small></article>
          <article className="stat-card"><span>דיסלייקים שקיבלתי</span><strong>{totalDislikes}</strong><small>בכל התגובות השמורות</small></article>
          <article className="stat-card"><span>אתרים שהגבתי בהם</span><strong>{statisticsSites.length}</strong><small>אתרים שונים</small></article>
        </div>
        <div className="statistics-sites"><h3>איפה הגבתי הכי הרבה?</h3>{siteStats.length ? siteStats.map(([site, count]) => <div className="site-stat" key={site}><span>{site}</span><div className="site-stat-track"><i style={{ width: `${Math.max(8, count / topSiteCount * 100)}%` }} /></div><strong>{count}</strong></div>) : <p>שמרו תגובה ראשונה כדי להתחיל לצבור נתונים.</p>}</div>
      </section>

      <section className="progress-section" id="progress" aria-labelledby="progress-title">
        <div className="statistics-heading"><div><span className="section-kicker">הדרך שלך</span><h2 id="progress-title">ההתקדמות שלי</h2></div><span className={`user-badge ${currentBadge.className}`}><span className="badge-art" aria-hidden="true">{currentBadge.icon}</span><span className="badge-copy"><strong>{currentBadge.name}</strong><small>הדרגה הנוכחית</small></span></span></div>
        <div className="progress-summary"><strong>{totalPoints}</strong><span>נקודות זכות</span></div>
        {nextBadge ? <><p className="next-badge-copy">עוד {nextBadge.min - totalPoints} נקודות לדרגת {nextBadge.name}</p><div className="progress-track" role="progressbar" aria-label="התקדמות לדרגה הבאה" aria-valuenow={badgeProgress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${badgeProgress}%` }} /></div></> : <p className="next-badge-copy">הגעת לדרגה הגבוהה ביותר — כל הכבוד!</p>}
        <div className="badge-milestones">{BADGES.map((badge, index) => <div key={badge.className} className={`badge-milestone ${totalPoints >= badgeThresholds[index] ? 'earned' : ''}`}><span className="badge-milestone-icon">{badge.icon}</span><strong>{badge.name}</strong><small>{badgeThresholds[index]} נקודות</small></div>)}</div>
      </section>

      <section className="progress-details" aria-label="פירוט נקודות ופעילות הבלוג">
        <div className="points-breakdown">
          <h3>איך צוברים נקודות?</h3>
          <div><span>תגובות ששמרתי · נקודה לכל תגובה</span><strong>+{pointsFromSavedComments}</strong></div>
          <div><span>לייקים לתגובות שלי · 2 נקודות לכל לייק</span><strong>+{pointsFromCommentLikes}</strong></div>
          <div><span>דיסלייקים לתגובות שלי · מינוס 2 לכל דיסלייק</span><strong>{pointsFromCommentDislikes}</strong></div>
          <div><span>פוסטים ששיתפתי בבלוג · 5 נקודות לפוסט</span><strong>+{pointsFromBlogPosts}</strong></div>
          <div><span>תגובות שקיבלתי בבלוג · 2 נקודות לכל תגובה</span><strong>+{pointsFromBlogComments}</strong></div>
          <div><span>לייקים חיוביים בבלוג · 2 נקודות לכל לייק</span><strong>+{pointsFromBlogLikes}</strong></div>
          <div><span>דיסלייקים בבלוג · מינוס 2 לכל דיסלייק</span><strong>{pointsFromBlogDislikes}</strong></div>
          {rawPoints < 0 && <small>הניקוד לא יורד מתחת לאפס.</small>}
        </div>
        <div className="blog-activity-panel">
          <h3>פעילות הבלוג</h3>
          <p>מספר הפוסטים והתגובות מתעדכן אוטומטית. אפשר להזין ידנית לייקים ודיסלייקים שהתקבלו בבלוג.</p>
          <div className="blog-activity-grid">
            <div className="blog-count"><span>פוסטים שפורסמו</span><strong>{blogPosts.length}</strong></div>
            <div className="blog-count"><span>תגובות שהתקבלו</span><strong>{blogCommentsCount}</strong></div>
            <label>לייקים חיוביים בבלוג<input type="number" min="0" value={blogActivityDraft.blogLikesCount} onChange={event => setBlogActivityDraft(previous => ({ ...previous, blogLikesCount: event.target.value }))} /></label>
            <label>דיסלייקים בבלוג<input type="number" min="0" value={blogActivityDraft.blogDislikesCount} onChange={event => setBlogActivityDraft(previous => ({ ...previous, blogDislikesCount: event.target.value }))} /></label>
          </div>
          <button className="primary-button" onClick={saveBlogActivity}>שמירת נתוני הבלוג</button>
        </div>
      </section>

      <section className="blog-section" id="blog" aria-labelledby="blog-title">
        <div className="statistics-heading"><div><span className="section-kicker">המילים שלך</span><h2 id="blog-title">הבלוג שלי</h2></div><span className="statistics-period">{blogPosts.length} פוסטים</span></div>
        <form className="blog-compose" onSubmit={createBlogPost}>
          <label>כותרת הפוסט<input maxLength="160" required value={blogDraft.title} onChange={event => setBlogDraft(previous => ({ ...previous, title: event.target.value }))} placeholder="על מה בא לך לכתוב?" /></label>
          <label>תוכן הפוסט<textarea maxLength="10000" required value={blogDraft.content} onChange={event => setBlogDraft(previous => ({ ...previous, content: event.target.value }))} placeholder="שתף מחשבות, רעיונות או סיפור..." /></label>
          <button className="primary-button" type="submit">פרסום פוסט · 5 נקודות</button>
        </form>
        {blogPosts.length ? <div className="blog-post-list">{blogPosts.map(post => {
          const commentDraft = blogCommentDrafts[post._id] || { author: '', content: '' };
          return <article className="blog-post" key={post._id}>
            <div className="blog-post-heading"><div><h3>{post.title}</h3><span className="saved-date">פורסם {new Date(post.createdAt).toLocaleDateString('he-IL')}</span></div><button className="delete-button" onClick={() => deleteBlogPost(post)}>מחיקת פוסט</button></div>
            <p className="blog-post-content">{post.content}</p>
            <div className="blog-comments"><h4>תגובות <span>{post.comments?.length || 0}</span></h4>
              {post.comments?.length ? <ul>{post.comments.map(comment => <li key={comment._id}><strong>{comment.author}</strong><span>{comment.content}</span><small>{new Date(comment.createdAt).toLocaleDateString('he-IL')}</small></li>)}</ul> : <p className="blog-no-comments">עדיין אין תגובות לפוסט.</p>}
              <div className="blog-comment-compose"><input aria-label="שם המגיב" maxLength="80" placeholder="שם המגיב" value={commentDraft.author} onChange={event => setBlogCommentDrafts(previous => ({ ...previous, [post._id]: { ...commentDraft, author: event.target.value } }))} /><input aria-label="תוכן התגובה" maxLength="2000" placeholder="כתיבת תגובה" value={commentDraft.content} onChange={event => setBlogCommentDrafts(previous => ({ ...previous, [post._id]: { ...commentDraft, content: event.target.value } }))} /><button className="update-replies" onClick={() => addBlogComment(post)}>הוספת תגובה · 2 נקודות</button></div>
            </div>
          </article>;
        })}</div> : <div className="empty-state blog-empty"><span>✎</span><h3>הפוסט הראשון שלך מתחיל כאן</h3><p>שתף משהו שחשוב לך — כל פוסט שתפרסם יוסיף 5 נקודות להתקדמות שלך.</p></div>}
      </section>

      <section className={`card form-card ${editingConversationId ? 'is-editing' : 'is-new'}`} id="comments">
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
              <div className="reaction-tools">
                {editingReactionsId === conversation._id ? <>
                  <label>👍 <input type="number" min="0" value={reactionsDraft.likesCount} onChange={event => setReactionsDraft(previous => ({ ...previous, likesCount: event.target.value }))} aria-label="מספר לייקים" /></label>
                  <label>👎 <input type="number" min="0" value={reactionsDraft.dislikesCount} onChange={event => setReactionsDraft(previous => ({ ...previous, dislikesCount: event.target.value }))} aria-label="מספר דיסלייקים" /></label>
                  <button className="update-replies" onClick={() => updateReactions(conversation)}>שמור</button>
                </> : <>
                  <span>👍 {conversation.likesCount || 0}</span><span>👎 {conversation.dislikesCount || 0}</span>
                  <button className="card-update-button" onClick={() => startReactionsEdit(conversation)}>עדכון לייקים</button>
                </>}
              </div>
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
