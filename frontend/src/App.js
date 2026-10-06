import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

axios.defaults.withCredentials = true;
const API_BASE_URL = '';

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

const getLocalDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const getLocalWeekStart = (date) => {
  const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  return weekStart;
};

const AVATARS = [
  { id: 'comment-bubble', label: 'בועת תגובה', emoji: '🗨️' },
  { id: 'woman-writer', label: 'מגיבה', emoji: '👩🏻‍💻' },
  { id: 'man-writer', label: 'מגיב', emoji: '👨🏻‍💻' },
  { id: 'robot', label: 'רובוט', emoji: '🤖' },
  { id: 'owl', label: 'ינשוף', emoji: '🦉' },
  { id: 'fox', label: 'שועל', emoji: '🦊' },
  { id: 'cat', label: 'חתול', emoji: '🐱' },
  { id: 'notebook', label: 'מחברת', emoji: '📝' },
];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [splashDelayDone, setSplashDelayDone] = useState(() => sessionStorage.getItem('comment-tracker-splash-seen') === 'true');
  const [authStatus, setAuthStatus] = useState({ needsInitialOwner: false, setupCodeConfigured: false });
  const [authMode, setAuthMode] = useState('login');
  const [authDraft, setAuthDraft] = useState({ email: '', password: '', passwordConfirm: '', displayName: localStorage.getItem('comment-tracker-nickname') || '', setupCode: '' });
  const [authError, setAuthError] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [convos, setConvos] = useState([]);
  const [taskRewards, setTaskRewards] = useState({ totalPoints: 0, claims: [] });
  const [taskRewardsReady, setTaskRewardsReady] = useState(false);
  const taskRewardRequestsRef = useRef(new Set());
  const [blogPosts, setBlogPosts] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [copiedSourcePostId, setCopiedSourcePostId] = useState(null);
  const [blogDraft, setBlogDraft] = useState({ title: '', content: '', sourceTitle: '', sourceUrl: '' });
  const [blogDraftSourceConversationIds, setBlogDraftSourceConversationIds] = useState([]);
  const [editingBlogPostId, setEditingBlogPostId] = useState(null);
  const [isPublicProfileOpen, setIsPublicProfileOpen] = useState(false);
  const [publicProfile, setPublicProfile] = useState(null);
  const [publicProfileLoading, setPublicProfileLoading] = useState(false);
  const [publicProfileError, setPublicProfileError] = useState('');
  const [blogCommentDrafts, setBlogCommentDrafts] = useState({});
  const [pendingBlogReactions, setPendingBlogReactions] = useState({});
  const [topicFilter, setTopicFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [repliesFilter, setRepliesFilter] = useState('all');
  const [siteFilter, setSiteFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [myBlogSearchText, setMyBlogSearchText] = useState('');
  const [communityBlogSearchText, setCommunityBlogSearchText] = useState('');
  const [myBlogDateRange, setMyBlogDateRange] = useState({ from: '', to: '' });
  const [myBlogAuthorFilter, setMyBlogAuthorFilter] = useState('all');
  const [communityBlogAuthorFilter, setCommunityBlogAuthorFilter] = useState('all');
  const [communityBlogDateRange, setCommunityBlogDateRange] = useState({ from: '', to: '' });
  const [blogSortOrder, setBlogSortOrder] = useState('newest');
  const [successMessage, setSuccessMessage] = useState('');
  const successTimerRef = useRef(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBlogFormOpen, setIsBlogFormOpen] = useState(false);
  const dashboardSectionIds = ['statistics', 'tasks', 'recommendations', 'progress', 'blog', 'community-blog', 'leaderboard', 'settings', 'comments'];
  const [dashboardOrder, setDashboardOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('comment-tracker-section-order') || 'null');
      return Array.isArray(saved) && dashboardSectionIds.every(id => saved.includes(id)) ? saved : dashboardSectionIds;
    } catch { return dashboardSectionIds; }
  });
  const [collapsedDashboardSections, setCollapsedDashboardSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('comment-tracker-collapsed-sections') || '{}'); }
    catch { return {}; }
  });
  const [editingRepliesId, setEditingRepliesId] = useState(null);
  const [repliesDraft, setRepliesDraft] = useState('');
  const [editingReactionsId, setEditingReactionsId] = useState(null);
  const [reactionsDraft, setReactionsDraft] = useState({ likesCount: '0', dislikesCount: '0' });
  const [statisticsTopicFilter, setStatisticsTopicFilter] = useState('all');
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [theme, setTheme] = useState('day');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSaveStatus, setAvatarSaveStatus] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [isEditingNickname, setIsEditingNickname] = useState(false);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
    successTimerRef.current = window.setTimeout(() => setSuccessMessage(''), 2800);
  };

  const moveDashboardSection = (sectionId, direction) => {
    setDashboardOrder(previous => {
      const index = previous.indexOf(sectionId);
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      localStorage.setItem('comment-tracker-section-order', JSON.stringify(next));
      return next;
    });
  };

  const toggleDashboardSection = (sectionId) => {
    setCollapsedDashboardSections(previous => {
      const next = { ...previous, [sectionId]: !previous[sectionId] };
      localStorage.setItem('comment-tracker-collapsed-sections', JSON.stringify(next));
      return next;
    });
  };

  const sectionControls = (sectionId, label) => {
    const sectionIndex = dashboardOrder.indexOf(sectionId);
    return <div className="dashboard-section-controls" aria-label={`ניהול אזור ${label}`}>
      <button type="button" onClick={() => moveDashboardSection(sectionId, -1)} disabled={sectionIndex === 0} aria-label={`העבר את ${label} למעלה`} title="העבר למעלה">↑</button>
      <button type="button" onClick={() => moveDashboardSection(sectionId, 1)} disabled={sectionIndex === dashboardOrder.length - 1} aria-label={`העבר את ${label} למטה`} title="העבר למטה">↓</button>
      <button type="button" onClick={() => toggleDashboardSection(sectionId)} aria-expanded={!collapsedDashboardSections[sectionId]} aria-label={`${collapsedDashboardSections[sectionId] ? 'פתח' : 'סגור'} את ${label}`} title={collapsedDashboardSections[sectionId] ? 'פתח אזור' : 'סגור אזור'}>
        {collapsedDashboardSections[sectionId] ? '＋' : '−'}
      </button>
    </div>;
  };

  useEffect(() => {
    if (splashDelayDone) return undefined;
    const timeout = window.setTimeout(() => {
      sessionStorage.setItem('comment-tracker-splash-seen', 'true');
      setSplashDelayDone(true);
    }, 4000);
    return () => window.clearTimeout(timeout);
  }, [splashDelayDone]);

  useEffect(() => () => {
    if (successTimerRef.current) window.clearTimeout(successTimerRef.current);
  }, []);

  const navigateToSection = (event, sectionId) => {
    event.preventDefault();
    setIsMobileNavOpen(false);
    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, isMobileNavOpen ? 320 : 0);
  };

  useEffect(() => {
    let active = true;
    const initializeAuth = async () => {
      try {
        const status = await axios.get(`${API_BASE_URL}/api/auth/status`);
        if (!active) return;
        setAuthStatus(status.data);
        if (status.data.needsInitialOwner) setAuthMode('register');
        try {
          const response = await axios.get(`${API_BASE_URL}/api/auth/me`);
          if (active) setCurrentUser(response.data.user);
        } catch (err) {
          if (err.response?.status !== 401) setAuthError('לא הצלחנו להתחבר לשרת. נסו לרענן את העמוד.');
        }
      } catch (err) {
        if (active) setAuthError('לא הצלחנו להתחבר לשרת. בדקו את חיבור האינטרנט ונסו שוב.');
      } finally {
        if (active) setAuthReady(true);
      }
    };
    initializeAuth();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    setNickname(currentUser.displayName);
    setTheme(currentUser.theme || 'day');
    setNicknameDraft(currentUser.displayName);
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setTaskRewards({ totalPoints: 0, claims: [] });
      setTaskRewardsReady(false);
      return undefined;
    }
    let active = true;
    setTaskRewardsReady(false);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    axios.get(`${API_BASE_URL}/api/task-rewards`, { params: { timeZone } })
      .then(response => {
        if (active) setTaskRewards(response.data);
      })
      .catch(err => console.error('Load task rewards error:', err.response?.data || err.message))
      .finally(() => { if (active) setTaskRewardsReady(true); });
    return () => { active = false; };
  }, [currentUser]);

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError('');
    const isRegister = authMode === 'register';
    if (isRegister && authDraft.password !== authDraft.passwordConfirm) {
      setAuthError('הסיסמאות אינן תואמות.');
      return;
    }
    const endpoint = isRegister ? 'register' : 'login';
    const payload = isRegister
      ? { email: authDraft.email, password: authDraft.password, displayName: authDraft.displayName, setupCode: authDraft.setupCode }
      : { email: authDraft.email, password: authDraft.password };
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/${endpoint}`, payload);
      setCurrentUser(response.data.user);
      if (isRegister) setAuthStatus(previous => ({ ...previous, needsInitialOwner: false }));
      setAuthError('');
    } catch (err) {
      setAuthError(err.response?.data?.message || 'ההתחברות נכשלה. נסו שוב.');
    }
  };

  const signOut = async () => {
    try { await axios.post(`${API_BASE_URL}/api/auth/logout`); }
    catch (err) { console.error('Sign out error:', err.response?.data || err.message); }
    setCurrentUser(null);
    setConvos([]);
    setBlogPosts([]);
    setGlobalLeaderboard([]);
    setLeaderboardError('');
    setBlogDraft({ title: '', content: '', sourceTitle: '', sourceUrl: '' });
    setBlogDraftSourceConversationIds([]);
    setBlogCommentDrafts({});
    setAuthMode('login');
    setAuthDraft({ email: '', password: '', passwordConfirm: '', displayName: '', setupCode: '' });
  };

  const changeTheme = async (nextTheme) => {
    setShowThemeMenu(false);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, { theme: nextTheme });
      setCurrentUser(response.data.user);
      showSuccess('ערכת הנושא נשמרה');
    } catch (err) {
      console.error('Save theme error:', err.response?.data || err.message);
      alert('שמירת ערכת הנושא נכשלה.');
    }
  };

  const changeAvatar = async (nextAvatarId) => {
    setAvatarSaving(true);
    setAvatarSaveStatus('שומר את האווטר...');
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, { avatarId: nextAvatarId });
      setCurrentUser(response.data.user);
      setBlogPosts(previous => previous.map(post => String(post.ownerId || '') === currentUser.id ? { ...post, avatarId: nextAvatarId } : post));
      setAvatarSaveStatus('הבחירה נשמרה');
    } catch (err) {
      console.error('Save avatar error:', err.response?.data || err.message);
      setAvatarSaveStatus('לא הצלחנו לשמור. נסו שוב.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const startNicknameEdit = () => {
    setNicknameDraft(nickname);
    setIsEditingNickname(true);
  };

  const saveNickname = async () => {
    const nextNickname = nicknameDraft.trim();
    if (!nextNickname) return;
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, { displayName: nextNickname });
      setCurrentUser(response.data.user);
      setNickname(response.data.user.displayName);
      setIsEditingNickname(false);
      showSuccess('הכינוי נשמר');
    } catch (err) {
      console.error('Save display name error:', err.response?.data || err.message);
      alert('שמירת הכינוי נכשלה.');
    }
  };

  const load = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/conversations`);
    setConvos(res.data);
  };

  const syncBlogSourceMetrics = (changedConversation, removed = false) => {
    const changedId = String(changedConversation._id);
    setBlogPosts(previous => previous.map(post => {
      const sourceIds = (post.sourceConversationIds || []).map(String);
      if (!sourceIds.includes(changedId)) return post;
      const sourceConversations = sourceIds.map(id => {
        if (id === changedId) return removed ? null : changedConversation;
        return convos.find(conversation => String(conversation._id) === id) || null;
      }).filter(Boolean);
      return {
        ...post,
        sourceLikesCount: sourceConversations.reduce((total, conversation) => total + (conversation.likesCount || 0), 0),
        sourceDislikesCount: sourceConversations.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0),
      };
    }));
  };

  const loadBlogPosts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/blog-posts`);
      setBlogPosts(response.data);
    } catch (err) {
      console.error('Load blog posts error:', err.response?.data || err.message);
    }
  };

  const loadGlobalLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/blog-posts/leaderboard`);
      setGlobalLeaderboard(response.data);
    } catch (err) {
      console.error('Load global leaderboard error:', err.response?.data || err.message);
      setLeaderboardError('לא הצלחנו לטעון את טבלת המגיבים. נסו שוב.');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    load();
    loadBlogPosts();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const timeout = window.setTimeout(loadGlobalLeaderboard, 250);
    return () => window.clearTimeout(timeout);
  }, [currentUser, convos, blogPosts]);

  useEffect(() => {
    if (!isPublicProfileOpen) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') setIsPublicProfileOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isPublicProfileOpen]);

  const openPublicProfile = async (userId) => {
    if (!userId) return;
    setIsPublicProfileOpen(true);
    setPublicProfile(null);
    setPublicProfileError('');
    setPublicProfileLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/blog-posts/authors/${userId}`);
      setPublicProfile(response.data);
    } catch (err) {
      console.error('Load public profile error:', err.response?.data || err.message);
      setPublicProfileError('לא הצלחנו לטעון את הפרופיל. נסו שוב.');
    } finally {
      setPublicProfileLoading(false);
    }
  };

  const createBlogPost = async (event) => {
    event.preventDefault();
    const author = nickname.trim();
    const title = blogDraft.title.trim();
    const content = blogDraft.content.trim();
    const sourceTitle = blogDraft.sourceTitle.trim();
    const sourceUrl = blogDraft.sourceUrl.trim();
    if (!author) {
      alert('בחרו כינוי לפני פרסום פוסט.');
      return;
    }
    if (!title || !content) return;
    try {
      const postData = { author, title, content, sourceTitle, sourceUrl };
      const response = editingBlogPostId
        ? await axios.put(`${API_BASE_URL}/api/blog-posts/${editingBlogPostId}`, blogDraftSourceConversationIds.length ? { ...postData, sourceConversationIds: blogDraftSourceConversationIds } : postData)
        : await axios.post(`${API_BASE_URL}/api/blog-posts`, { ...postData, sourceConversationIds: blogDraftSourceConversationIds });
      if (editingBlogPostId) {
        setBlogPosts(previous => previous.map(post => post._id === editingBlogPostId ? response.data : post));
      } else {
        setBlogPosts(previous => [response.data, ...previous]);
      }
      setBlogDraft({ title: '', content: '', sourceTitle: '', sourceUrl: '' });
      setBlogDraftSourceConversationIds([]);
      setEditingBlogPostId(null);
      setIsBlogFormOpen(false);
      showSuccess(editingBlogPostId ? 'הפוסט עודכן' : 'הפוסט פורסם');
    } catch (err) {
      console.error(editingBlogPostId ? 'Update blog post error:' : 'Create blog post error:', err.response?.data || err.message);
      alert(editingBlogPostId ? 'עדכון הפוסט נכשל.' : 'שמירת הפוסט נכשלה.');
    }
  };

  const cancelBlogDraft = () => {
    const hasDraft = Object.values(blogDraft).some(value => value.trim())
      || blogDraftSourceConversationIds.length > 0;
    if (hasDraft && !window.confirm(editingBlogPostId ? 'לבטל את עריכת הפוסט? השינויים שלא נשמרו יימחקו.' : 'למחוק את טיוטת הפוסט?')) return;
    setBlogDraft({ title: '', content: '', sourceTitle: '', sourceUrl: '' });
    setBlogDraftSourceConversationIds([]);
    setEditingBlogPostId(null);
    setIsBlogFormOpen(false);
  };

  const startBlogPostEdit = (post) => {
    setEditingBlogPostId(post._id);
    setBlogDraft({ title: post.title || '', content: post.content || '', sourceTitle: post.sourceTitle || '', sourceUrl: post.sourceUrl || '' });
    setBlogDraftSourceConversationIds((post.sourceConversationIds || []).map(String));
    setIsBlogFormOpen(true);
    document.getElementById('blog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const deleteBlogPost = async (post) => {
    if (!window.confirm('למחוק את הפוסט ואת התגובות שלו?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/blog-posts/${post._id}`);
      setBlogPosts(previous => previous.filter(item => item._id !== post._id));
      showSuccess('הפוסט נמחק');
      if (editingBlogPostId === post._id) {
        setBlogDraft({ title: '', content: '', sourceTitle: '', sourceUrl: '' });
        setBlogDraftSourceConversationIds([]);
        setEditingBlogPostId(null);
        setIsBlogFormOpen(false);
      }
    } catch (err) {
      console.error('Delete blog post error:', err.response?.data || err.message);
      alert('מחיקת הפוסט נכשלה.');
    }
  };

  const addBlogComment = async (post) => {
    const draft = blogCommentDrafts[post._id] || { author: '', content: '' };
    const author = nickname.trim();
    const content = draft.content.trim();
    if (!author) {
      alert('בחרו כינוי לפני הוספת תגובה.');
      return;
    }
    if (!author || !content) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/blog-posts/${post._id}/comments`, { author, content });
      setBlogPosts(previous => previous.map(item => item._id === post._id ? response.data : item));
      setBlogCommentDrafts(previous => ({ ...previous, [post._id]: { author: '', content: '' } }));
      showSuccess('התגובה נוספה');
    } catch (err) {
      console.error('Add blog comment error:', err.response?.data || err.message);
      alert('שמירת התגובה נכשלה.');
    }
  };

  const copyPostBeforeOpeningSource = (post) => {
    if (!navigator.clipboard?.writeText) {
      window.alert('הכתבה נפתחת, אבל ההעתקה האוטומטית אינה זמינה בדפדפן הזה.');
      return;
    }
    navigator.clipboard.writeText(post.content).then(() => {
      setCopiedSourcePostId(post._id);
      window.setTimeout(() => setCopiedSourcePostId(current => current === post._id ? null : current), 2500);
    }).catch((error) => {
      console.error('Copy post content error:', error);
      window.alert('הכתבה נפתחת, אבל העתקת התוכן נכשלה.');
    });
  };

  const renderBlogPost = (post, showDelete = false) => {
    const commentDraft = blogCommentDrafts[post._id] || { content: '' };
    const isMyPost = showDelete && String(post.ownerId || '') === currentUser.id;
    return <article className="blog-post" key={post._id} style={{ '--post-avatar-emoji': JSON.stringify((AVATARS.find(avatar => avatar.id === post.avatarId) || AVATARS[0]).emoji) }}>
      <div className="blog-post-heading"><div><h3>{post.title}</h3>{post.ownerId ? <button className="blog-post-author" onClick={() => openPublicProfile(post.ownerId)}>מאת {post.author || 'חבר/ת קהילה'}</button> : <span className="blog-post-author">מאת {post.author || 'חבר/ת קהילה'}</span>}<span className="saved-date">פורסם {new Date(post.createdAt).toLocaleDateString('he-IL')}</span></div>{isMyPost && <div className="blog-post-controls"><button className="edit-blog-button" onClick={() => startBlogPostEdit(post)}>עריכת פוסט</button><button className="delete-button" onClick={() => deleteBlogPost(post)}>מחיקת פוסט</button></div>}</div>
      <p className="blog-post-content">{post.content}</p>
      {post.sourceUrl && <a className="blog-source-link" href={post.sourceUrl} target="_blank" rel="noreferrer" title="התוכן יועתק כדי שיהיה קל למצוא אותו בחיפוש בתוך הכתבה" onClick={() => copyPostBeforeOpeningSource(post)}>{copiedSourcePostId === post._id ? '✓ התוכן הועתק — חפשו אותו בכתבה' : `↗ ${post.sourceTitle || 'לכתבה המקורית'}`}</a>}
      {(post.sourceLikesCount > 0 || post.sourceDislikesCount > 0) && <div className="blog-original-metrics" aria-label="לייקים ודיסלייקים של התגובה המקורית, לתצוגה בלבד">
        <span className="blog-original-caption">לתגובה המקורית</span>
        <span className="blog-original-metric like"><span aria-hidden="true">👍</span>{post.sourceLikesCount || 0}</span>
        <span className="blog-original-metric dislike"><span aria-hidden="true">👎</span>{post.sourceDislikesCount || 0}</span>
      </div>}
      <section className="blog-vote-panel" aria-label="דירוג הפוסט">
        <div className="blog-vote-heading"><span>דירוג הקהילה</span><strong>מה דעתך על הפוסט?</strong><small>ההצבעה לפוסט נספרת בנפרד מנתוני התגובה המקורית.</small></div>
        <div className="blog-vote-actions">
          <button className={`blog-vote-option like ${post.myReaction === 'like' ? 'selected' : ''}`} aria-pressed={post.myReaction === 'like'} disabled={pendingBlogReactions[post._id]} onClick={() => reactToBlogPost(post, 'like')}>
            <span className="blog-vote-symbol" aria-hidden="true">↑</span><span className="blog-vote-label">לייק לפוסט</span><strong>{post.likesCount || 0}</strong>
          </button>
          <button className={`blog-vote-option dislike ${post.myReaction === 'dislike' ? 'selected' : ''}`} aria-pressed={post.myReaction === 'dislike'} disabled={pendingBlogReactions[post._id]} onClick={() => reactToBlogPost(post, 'dislike')}>
            <span className="blog-vote-symbol" aria-hidden="true">↓</span><span className="blog-vote-label">דיסלייק לפוסט</span><strong>{post.dislikesCount || 0}</strong>
          </button>
        </div>
      </section>      <div className="blog-comments"><h4>תגובות <span>{post.comments?.length || 0}</span></h4>
        {post.comments?.length ? <ul>{post.comments.map(comment => <li key={comment._id}><strong>{comment.author}</strong><span>{comment.content}</span><small>{new Date(comment.createdAt).toLocaleDateString('he-IL')}</small></li>)}</ul> : <p className="blog-no-comments">עדיין אין תגובות לפוסט.</p>}
        <div className="blog-comment-compose"><input aria-label="תוכן התגובה" maxLength="2000" placeholder={nickname ? `תגובה בשם ${nickname}` : 'בחרו כינוי לפני כתיבת תגובה'} value={commentDraft.content} onChange={event => setBlogCommentDrafts(previous => ({ ...previous, [post._id]: { content: event.target.value } }))} /><button className="update-replies" onClick={() => addBlogComment(post)}>הוספת תגובה · 2 נקודות</button></div>
      </div>
    </article>;
  };

  const reactToBlogPost = async (post, reaction) => {
    if (pendingBlogReactions[post._id]) return;
    const current = post.myReaction || null;
    const next = current === reaction ? null : reaction;
    if (current === next) return;
    setPendingBlogReactions(previous => ({ ...previous, [post._id]: true }));
    try {
      const response = await axios.put(`${API_BASE_URL}/api/blog-posts/${post._id}/reactions`, { reaction: next });
      setBlogPosts(previous => previous.map(item => item._id === post._id ? response.data : item));
      showSuccess('הדירוג נשמר');
    } catch (err) {
      console.error('Update blog reaction error:', err.response?.data || err.message);
      alert('עדכון הלייק או הדיסלייק נכשל.');
    } finally {
      setPendingBlogReactions(previous => ({ ...previous, [post._id]: false }));
    }
  };

  const addSavedCommentToBlog = (conversation) => {
    const quote = document.querySelector(`[data-comment-id="${conversation._id}"]`);
    const selection = window.getSelection();
    const selectedText = selection && selection.rangeCount && quote?.contains(selection.anchorNode)
      && quote.contains(selection.focusNode) ? selection.toString().trim() : '';
    const textToAdd = selectedText || conversation.yourComment || '';
    setBlogDraftSourceConversationIds(previous => previous.includes(conversation._id)
      ? previous
      : [...previous, conversation._id]);
    setIsBlogFormOpen(true);
    setBlogDraft(previous => ({
      title: previous.title || `מתוך תגובה על: ${conversation.pageTitle || conversation.siteName}`,
      content: previous.content ? `${previous.content}\n\n${textToAdd}` : textToAdd,
      sourceTitle: previous.sourceTitle || conversation.pageTitle || conversation.siteName || '',
      sourceUrl: previous.sourceUrl || conversation.siteUrl || '',
    }));
    document.getElementById('blog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.querySelector('.blog-compose textarea')?.focus(), 350);
  };

  const submit = async () => {
    if (!form.siteName || !form.siteUrl || !form.pageTitle || !form.yourComment || !form.hint) {
      alert('נא למלא את כל השדות המסומנים');
      return;
    }
    try {
      if (editingConversationId) {
        const response = await axios.put(`${API_BASE_URL}/api/conversations/${editingConversationId}`, form);
        setConvos(previous => previous.map(item => item._id === editingConversationId ? response.data : item));
        setEditingConversationId(null);
        setForm(emptyForm);
        setIsFormOpen(false);
      } else {
        await axios.post(`${API_BASE_URL}/api/conversations`, form);
        setForm(emptyForm);
        load();
      }
      showSuccess(editingConversationId ? 'התגובה השמורה עודכנה' : 'התגובה נשמרה');
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
      await axios.delete(`${API_BASE_URL}/api/conversations/${conversation._id}`);
      setConvos(previous => previous.filter(item => item._id !== conversation._id));
      syncBlogSourceMetrics(conversation, true);
      showSuccess('התגובה השמורה נמחקה');
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
      const response = await axios.put(`${API_BASE_URL}/api/conversations/${conversation._id}/replies`, { repliesCount });
      setConvos(previous => previous.map(item => item._id === conversation._id ? response.data : item));
      setEditingRepliesId(null);
      setRepliesDraft('');
      showSuccess('מספר המגיבים עודכן');
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
      const response = await axios.put(`${API_BASE_URL}/api/conversations/${conversation._id}/reactions`, { likesCount, dislikesCount });
      setConvos(previous => previous.map(item => item._id === conversation._id ? response.data : item));
      syncBlogSourceMetrics(response.data);
      setEditingReactionsId(null);
      showSuccess('הלייקים והדיסלייקים עודכנו');
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
  const myBlogPosts = currentUser ? blogPosts.filter(post => String(post.ownerId || '') === currentUser.id) : [];
  const communityBlogPosts = [...blogPosts];
  const myBlogAuthors = [...new Set(myBlogPosts.map(post => post.author?.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'he'));
  const blogAuthors = [...new Set(communityBlogPosts.map(post => post.author?.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'he'));
  const matchesBlogSearch = (post, search) => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return true;
    const searchableText = [post.title, post.content, post.author, post.sourceTitle, post.sourceUrl,
      ...(post.comments || []).flatMap(comment => [comment.author, comment.content])].filter(Boolean).join(' ').toLocaleLowerCase();
    return searchableText.includes(query);
  };
  const matchesBlogDateRange = (post, dateRange) => {
    const createdAt = new Date(post.createdAt);
    if (Number.isNaN(createdAt.getTime())) return false;
    if (dateRange.from && createdAt < new Date(`${dateRange.from}T00:00:00`)) return false;
    if (dateRange.to) {
      const endOfSelectedDay = new Date(`${dateRange.to}T00:00:00`);
      endOfSelectedDay.setDate(endOfSelectedDay.getDate() + 1);
      if (createdAt >= endOfSelectedDay) return false;
    }
    return true;
  };
  const sortBlogPosts = posts => [...posts].sort((first, second) => {
    if (blogSortOrder === 'popular') {
      const likesDifference = (second.likesCount || 0) - (first.likesCount || 0);
      if (likesDifference) return likesDifference;
      const commentsDifference = (second.comments?.length || 0) - (first.comments?.length || 0);
      if (commentsDifference) return commentsDifference;
    }
    return new Date(second.createdAt) - new Date(first.createdAt);
  });
  const filteredMyBlogPosts = sortBlogPosts(myBlogPosts.filter(post =>
    matchesBlogSearch(post, myBlogSearchText)
    && matchesBlogDateRange(post, myBlogDateRange)
    && (myBlogAuthorFilter === 'all' || post.author?.trim() === myBlogAuthorFilter)));
  const filteredCommunityBlogPosts = sortBlogPosts(communityBlogPosts.filter(post =>
    matchesBlogSearch(post, communityBlogSearchText)
    && matchesBlogDateRange(post, communityBlogDateRange)
    && (communityBlogAuthorFilter === 'all' || post.author?.trim() === communityBlogAuthorFilter)));
  const blogCommentsCount = myBlogPosts.reduce((total, post) => total + (post.comments?.length || 0), 0);
  const pointsFromBlogPosts = myBlogPosts.length * 5;
  const pointsFromBlogComments = blogCommentsCount * 2;
  const totalBlogLikes = myBlogPosts.reduce((total, post) => total + (post.likesCount || 0), 0);
  const totalBlogDislikes = myBlogPosts.reduce((total, post) => total + (post.dislikesCount || 0), 0);
  const pointsFromBlogLikes = totalBlogLikes * 2;
  const pointsFromBlogDislikes = totalBlogDislikes * -2;
  const rawPoints = pointsFromSavedComments + pointsFromCommentLikes + pointsFromCommentDislikes
    + pointsFromBlogPosts + pointsFromBlogComments + pointsFromBlogLikes + pointsFromBlogDislikes;
  const taskRewardPoints = taskRewards.totalPoints || 0;
  const totalPoints = Math.max(0, rawPoints) + taskRewardPoints;
  const badgeThresholds = [0, 20, 60, 150, 300];
  const currentBadgeIndex = badgeThresholds.reduce((result, threshold, index) => totalPoints >= threshold ? index : result, 0);
  const currentBadge = BADGES[currentBadgeIndex];
  const currentAvatar = AVATARS.find(avatar => avatar.id === currentUser?.avatarId) || AVATARS[0];
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
  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const activityDates = new Set(convos
    .map(conversation => new Date(conversation.createdAt))
    .filter(date => !Number.isNaN(date.getTime()))
    .map(getLocalDateKey));
  const todaySavedComments = convos.filter(conversation => {
    const date = new Date(conversation.createdAt);
    return !Number.isNaN(date.getTime()) && getLocalDateKey(date) === todayKey;
  }).length;
  const monthSavedComments = convos.filter(conversation => {
    const date = new Date(conversation.createdAt);
    return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === monthKey;
  }).length;
  const streakAnchor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!activityDates.has(todayKey)) streakAnchor.setDate(streakAnchor.getDate() - 1);
  let activityStreak = 0;
  for (let day = new Date(streakAnchor); activityDates.has(getLocalDateKey(day)); day.setDate(day.getDate() - 1)) activityStreak += 1;
  const missionItems = [
    { id: 'daily', icon: '◷', title: 'שמרו 3 תגובות היום', value: todaySavedComments, goal: 3, rewardPoints: 5, caption: `${todaySavedComments} מתוך 3` },
    { id: 'monthly', icon: '▦', title: 'שמרו 20 תגובות החודש', value: monthSavedComments, goal: 20, rewardPoints: 20, caption: `${monthSavedComments} מתוך 20 החודש` },
    { id: 'streak', icon: '↗', title: 'שמרו על רצף של 7 ימים', value: activityStreak, goal: 7, rewardPoints: 25, caption: `${activityStreak} מתוך 7 ימים ברצף` },
    { id: 'milestone', icon: '◇', title: 'הגיעו ל־50 תגובות שמורות', value: convos.length, goal: 50, rewardPoints: 50, caption: `${convos.length} מתוך 50 תגובות` },
  ];
  const taskTitleById = Object.fromEntries(missionItems.map(mission => [mission.id, mission.title]));
  useEffect(() => {
    if (!currentUser || !taskRewardsReady) return;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const currentMonthKey = todayKey.slice(0, 7);
    const missionsToCheck = [
      { id: 'daily', value: todaySavedComments, goal: 3, rewardPoints: 5 },
      { id: 'monthly', value: monthSavedComments, goal: 20, rewardPoints: 20 },
      { id: 'streak', value: activityStreak, goal: 7, rewardPoints: 25 },
      { id: 'milestone', value: convos.length, goal: 50, rewardPoints: 50 },
    ];
    missionsToCheck.filter(mission => mission.value >= mission.goal).forEach(mission => {
      const periodKey = mission.id === 'daily' ? todayKey : mission.id === 'milestone' ? 'once' : currentMonthKey;
      const alreadyClaimed = taskRewards.claims.some(claim => claim.taskId === mission.id && claim.periodKey === periodKey);
      const requestKey = `${mission.id}:${periodKey}`;
      if (alreadyClaimed || taskRewardRequestsRef.current.has(requestKey)) return;
      taskRewardRequestsRef.current.add(requestKey);
      axios.post(`${API_BASE_URL}/api/task-rewards/claim`, { taskId: mission.id, timeZone })
        .then(response => {
          setTaskRewards(previous => ({
            totalPoints: response.data.totalPoints,
            claims: [...previous.claims.filter(claim => !(claim.taskId === mission.id && claim.periodKey === periodKey)), response.data.claim],
          }));
          if (response.data.newlyAwarded) {
            showSuccess(`קיבלת ${mission.rewardPoints} נקודות על השלמת המשימה!`);
            loadGlobalLeaderboard();
          }
        })
        .catch(err => console.error('Claim task reward error:', err.response?.data || err.message))
        .finally(() => taskRewardRequestsRef.current.delete(requestKey));
    });
  }, [currentUser, taskRewardsReady, taskRewards.claims, todayKey, todaySavedComments, monthSavedComments, activityStreak, convos.length]);
  const currentWeekStart = getLocalWeekStart(now);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const previousWeekEnd = new Date(now);
  previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
  const currentWeekConvos = convos.filter(conversation => {
    const date = new Date(conversation.createdAt);
    return !Number.isNaN(date.getTime()) && date >= currentWeekStart && date <= now;
  });
  const previousWeekConvos = convos.filter(conversation => {
    const date = new Date(conversation.createdAt);
    return !Number.isNaN(date.getTime()) && date >= previousWeekStart && date <= previousWeekEnd;
  });
  const siteWeekActivity = Object.values(convos.reduce((sites, conversation) => {
    const date = new Date(conversation.createdAt);
    const site = conversation.siteName?.trim();
    if (!site || Number.isNaN(date.getTime()) || date < previousWeekStart || date > now) return sites;
    const counts = sites[site] || { name: site, current: 0, previous: 0 };
    if (date >= currentWeekStart) counts.current += 1;
    else if (date <= previousWeekEnd) counts.previous += 1;
    sites[site] = counts;
    return sites;
  }, {}));
  const siteToRevisit = siteWeekActivity
    .filter(site => site.previous > site.current)
    .sort((first, second) => (second.previous - second.current) - (first.previous - first.current))[0];
  const personalRecommendations = [];
  if (previousWeekConvos.length && currentWeekConvos.length > previousWeekConvos.length) {
    const increase = Math.round(((currentWeekConvos.length - previousWeekConvos.length) / previousWeekConvos.length) * 100);
    personalRecommendations.push({ icon: '↗', title: 'הפעילות שלך במגמת עלייה', message: `שמרת ${currentWeekConvos.length} תגובות עד עכשיו, ${increase}% יותר מאותה התקופה בשבוע שעבר. כדאי לשמור על הקצב.` });
  } else if (previousWeekConvos.length && currentWeekConvos.length < previousWeekConvos.length) {
    personalRecommendations.push({ icon: '◎', title: 'כדאי לחזור לקצב שלך', message: `שמרת ${currentWeekConvos.length} תגובות עד עכשיו לעומת ${previousWeekConvos.length} באותה התקופה בשבוע שעבר. יעד קטן של 2 תגובות נוספות יכול לעזור.` });
  } else if (currentWeekConvos.length && !previousWeekConvos.length) {
    personalRecommendations.push({ icon: '✦', title: 'השבוע התחלת לצבור פעילות', message: `שמרת ${currentWeekConvos.length} תגובות השבוע. נמשיך להשוות ככל שיצטברו נתונים.` });
  } else if (!currentWeekConvos.length) {
    personalRecommendations.push({ icon: '◷', title: 'אפשר להתחיל כבר השבוע', message: 'עדיין לא שמרת תגובות השבוע. שמירת תגובה אחת תתחיל לעדכן את ההתקדמות שלך.' });
  } else {
    personalRecommendations.push({ icon: '＝', title: 'שמרת על קצב יציב', message: `שמרת ${currentWeekConvos.length} תגובות השבוע, כמו בשבוע שעבר. אפשר להציב יעד קטן של תגובה נוספת.` });
  }
  if (siteToRevisit) {
    const message = siteToRevisit.current === 0
      ? `עד עכשיו לא שמרת תגובות באתר ${siteToRevisit.name}, שבו שמרת ${siteToRevisit.previous} באותה התקופה בשבוע שעבר. נסה לשמור שם 2 תגובות.`
      : `הפעילות באתר ${siteToRevisit.name} ירדה מ־${siteToRevisit.previous} ל־${siteToRevisit.current} תגובות שמורות בהשוואה לאותה התקופה בשבוע שעבר. אולי כדאי לחזור אליו.`;
    personalRecommendations.push({ icon: '⌖', title: 'אתר שכדאי לחזור אליו', message });
  }

  if (!authReady || !splashDelayDone) {
    return <main className="splash-screen" dir="rtl" role="status" aria-live="polite" aria-busy="true">
      <span className="splash-orb splash-orb-one" aria-hidden="true" />
      <span className="splash-orb splash-orb-two" aria-hidden="true" />
      <div className="splash-content">
        <div className="splash-brand">
          <span className="splash-logo" aria-hidden="true">CT</span>
          <div><span className="splash-eyebrow">המילים שלך, במקום אחד</span><h1>Comment <strong>Tracker</strong></h1></div>
        </div>
        <div className="splash-scene" aria-hidden="true">
          <span className="splash-sparkle sparkle-one">✦</span><span className="splash-sparkle sparkle-two">✦</span>
          <div className="splash-float-bubble bubble-like">♥ <strong>12</strong></div>
          <div className="splash-float-bubble bubble-reply">תגובה חדשה <span>↙</span></div>
          <div className="splash-note-card">
            <div className="splash-note-top"><span className="splash-note-avatar">א</span><span><i /><i /></span><b>•••</b></div>
            <div className="splash-note-lines"><i /><i /><i /></div>
            <div className="splash-note-bottom"><span>♥ אהבתי</span><span>↩ תגובה</span></div>
          </div>
        </div>
        <div className="splash-loading-copy"><span className="splash-loader-dots" aria-hidden="true"><i /><i /><i /></span><p>טוען את החשבון שלך</p></div>
        <div className="splash-progress-track" aria-hidden="true"><span /></div>
        <span className="splash-footer">שומרים את כל השיחות החשובות קרוב</span>
        <span className="splash-credit">נבנה על ידי <strong>BeSpoke</strong></span>
      </div>
    </main>;
  }

  if (!currentUser) {
    const registering = authMode === 'register';
    return <main className="auth-page" dir="rtl">
      <section className="auth-card">
        <span className="section-kicker">COMMENT TRACKER</span>
        <h1>{authStatus.needsInitialOwner ? 'פתיחת החשבון הראשון' : registering ? 'יצירת חשבון' : 'התחברות לחשבון'}</h1>
        <p>{authStatus.needsInitialOwner
          ? 'החשבון הראשון יקבל את התגובות והסטטיסטיקות הישנות ששמרת.'
          : registering
            ? 'צרו חשבון חדש כדי לשמור תגובות והתקדמות אישיות.'
            : 'התחברו לחשבון קיים, או בחרו יצירת חשבון חדש אם עדיין אין לכם חשבון.'}</p>
        {authStatus.needsInitialOwner && !authStatus.setupCodeConfigured && <div className="auth-setup-help">לפני יצירת החשבון הראשון, הוסיפו ל־Environment של שרת ה־backend ב־Render את המשתנה INITIAL_OWNER_SETUP_KEY. הקוד שתבחרו ישמש פעם אחת לשיוך הנתונים הקיימים לחשבונכם.</div>}
        <form className="auth-form" onSubmit={submitAuth}>
          {registering && <label>כינוי שיוצג באתר<input required maxLength="80" autoComplete="nickname" value={authDraft.displayName} onChange={event => setAuthDraft(previous => ({ ...previous, displayName: event.target.value }))} /></label>}
          <label>אימייל<input required type="email" maxLength="254" autoComplete="email" dir="ltr" value={authDraft.email} onChange={event => setAuthDraft(previous => ({ ...previous, email: event.target.value }))} /></label>
          <label>סיסמה<input required type="password" minLength="8" maxLength="128" autoComplete={registering ? 'new-password' : 'current-password'} value={authDraft.password} onChange={event => setAuthDraft(previous => ({ ...previous, password: event.target.value }))} /></label>
          {registering && <label>אימות סיסמה<input required type="password" minLength="8" maxLength="128" autoComplete="new-password" value={authDraft.passwordConfirm} onChange={event => setAuthDraft(previous => ({ ...previous, passwordConfirm: event.target.value }))} /></label>}
          {registering && authStatus.needsInitialOwner && authStatus.setupCodeConfigured && <label>קוד שיוך חד־פעמי<input required type="password" autoComplete="off" value={authDraft.setupCode} onChange={event => setAuthDraft(previous => ({ ...previous, setupCode: event.target.value }))} /></label>}
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          {registering && <small className="auth-note">לא נשלח אימות אימייל בשלב זה; נבדוק רק שכתובת האימייל בפורמט תקין. בחרו סיסמה באורך 8 תווים לפחות.</small>}
          <button className="primary-button" type="submit">{registering ? 'יצירת חשבון' : 'התחברות'}</button>
        </form>
        {!authStatus.needsInitialOwner && <button className="auth-mode-toggle" onClick={() => { setAuthError(''); setAuthMode(registering ? 'login' : 'register'); }}>
          {registering ? 'כבר יש לך חשבון? התחברות' : 'אין לך חשבון? יצירת חשבון חדש'}
        </button>}
      </section>
      <p className="auth-credit">נבנה על ידי <strong>BeSpoke</strong></p>
    </main>;
  }

  return (
    <div className={`app theme-${theme}`} dir="rtl">
      {successMessage && <div className="success-toast" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{successMessage}</div>}
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
          <div className="hero-count-compact"><strong>{convos.length}</strong><span>תגובות שמורות</span></div>
        </div>
        <div className="nickname-area">
          {isEditingNickname ? (
            <div className="nickname-editor">
              <input autoFocus maxLength="80" value={nicknameDraft} onChange={event => setNicknameDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') saveNickname(); if (event.key === 'Escape') { setNicknameDraft(nickname); setIsEditingNickname(false); } }} placeholder="הקלידו כינוי" aria-label="כינוי" />
              <button type="button" onClick={saveNickname}>שמור</button>
              <button type="button" className="nickname-cancel-button" onClick={() => { setNicknameDraft(nickname); setIsEditingNickname(false); }}>ביטול</button>
            </div>
          ) : (
            <button className={`nickname-button ${nickname ? 'has-nickname' : ''}`} style={{ '--avatar-emoji': JSON.stringify(currentAvatar.emoji) }} onClick={nickname ? startNicknameEdit : () => { setNicknameDraft(''); setIsEditingNickname(true); }}>
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
        <button className="mobile-nav-toggle" type="button" aria-expanded={isMobileNavOpen} aria-controls="main-nav-links" onClick={() => setIsMobileNavOpen(open => !open)}>
          <span className={`hamburger-icon ${isMobileNavOpen ? 'is-open' : ''}`} aria-hidden="true"><i /><i /><i /></span>
          <span>{isMobileNavOpen ? 'סגירת תפריט' : 'ניווט באתר'}</span>
          <span className="nav-toggle-hint" aria-hidden="true">{isMobileNavOpen ? '×' : '⌄'}</span>
        </button>
        <div className={`main-nav-links ${isMobileNavOpen ? 'is-open' : ''}`} id="main-nav-links">
          <a href="#home" onClick={event => navigateToSection(event, 'home')}>ראשי</a><a href="#comments" onClick={event => navigateToSection(event, 'comments')}>התגובות שלי</a><a href="#statistics" onClick={event => navigateToSection(event, 'statistics')}>הסטטיסטיקות שלי</a><a href="#tasks" onClick={event => navigateToSection(event, 'tasks')}>המשימות שלי</a><a href="#recommendations" onClick={event => navigateToSection(event, 'recommendations')}>המלצות אישיות</a><a href="#progress" onClick={event => navigateToSection(event, 'progress')}>ההתקדמות שלי</a><a href="#blog" onClick={event => navigateToSection(event, 'blog')}>הבלוג שלי</a><a href="#community-blog" onClick={event => navigateToSection(event, 'community-blog')}>בלוג המגיבים</a><a href="#leaderboard" onClick={event => navigateToSection(event, 'leaderboard')}>טבלת מגיבים</a><a href="#settings" onClick={event => navigateToSection(event, 'settings')}>הגדרות</a>
        </div>
      </nav>

      <div className="dashboard-sections">
      <div className={`dashboard-panel ${collapsedDashboardSections.statistics ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('statistics') }}>
      <section className="statistics-section" id="statistics" aria-labelledby="statistics-title">
        <div className="statistics-heading"><div><span className="section-kicker">המספרים שלך</span><h2 id="statistics-title">הסטטיסטיקות שלי</h2></div><span className="statistics-period">כל התקופה</span>{sectionControls('statistics', 'הסטטיסטיקות שלי')}</div>
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
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.tasks ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('tasks') }}>
      <section className="tasks-section" id="tasks" aria-labelledby="tasks-title">
        <div className="statistics-heading"><div><span className="section-kicker">צעד קטן בכל פעם</span><h2 id="tasks-title">המשימות שלי</h2></div><span className="tasks-streak">רצף נוכחי: <strong>{activityStreak}</strong> ימים</span>{sectionControls('tasks', 'המשימות שלי')}</div>
        <div className="tasks-grid">{missionItems.map(mission => {
          const progress = Math.min(100, Math.round((mission.value / mission.goal) * 100));
          const complete = mission.value >= mission.goal;
          const periodKey = mission.id === 'daily' ? todayKey : mission.id === 'milestone' ? 'once' : monthKey;
          const claimed = taskRewards.claims.some(claim => claim.taskId === mission.id && claim.periodKey === periodKey);
          return <article className={`mission-item ${complete ? 'is-complete' : ''}`} key={mission.id}>
            <div className="mission-heading"><span className="mission-icon" aria-hidden="true">{complete ? '✓' : mission.icon}</span><div><h3>{mission.title}</h3><p>{claimed ? `היעד הושלם · קיבלת ${mission.rewardPoints} נקודות` : complete ? 'היעד הושלם · מעדכן את הפרס...' : mission.caption}</p></div></div>
            <div className="mission-track" role="progressbar" aria-label={mission.title} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${progress}%` }} /></div>
            <div className="mission-reward"><span aria-hidden="true">✦</span>{claimed ? `הפרס התקבל: ${mission.rewardPoints} נקודות` : `פרס: ${mission.rewardPoints} נקודות`}</div>
          </article>;
        })}</div>
        <p className="tasks-note">הנקודות מתווספות אוטומטית עם השלמת היעד. משימות יומיות וחודשיות מעניקות פרס מחדש בכל תקופה.</p>
        <div className="task-reward-history" aria-labelledby="task-reward-history-title">
          <h3 id="task-reward-history-title">היסטוריית פרסים</h3>
          {taskRewards.claims.length ? <ul>{taskRewards.claims.map(claim => <li key={`${claim.taskId}-${claim.periodKey}`}>
            <span className="task-history-icon" aria-hidden="true">✦</span>
            <span className="task-history-name">{taskTitleById[claim.taskId] || 'משימה שהושלמה'}</span>
            <time dateTime={claim.createdAt}>{new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(claim.createdAt))}</time>
            <strong>+{claim.points} נק׳</strong>
          </li>)}</ul> : <p>הפרסים שתקבלו על השלמת משימות יופיעו כאן.</p>}
        </div>
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.recommendations ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('recommendations') }}>
      <section className="recommendations-section" id="recommendations" aria-labelledby="recommendations-title">
        <div className="statistics-heading"><div><span className="section-kicker">תובנות מהפעילות שלך</span><h2 id="recommendations-title">המלצות אישיות</h2></div><span className="statistics-period">השבוע לעומת הקודם</span>{sectionControls('recommendations', 'המלצות אישיות')}</div>
        <div className="recommendations-list">{personalRecommendations.map((recommendation, index) => <article className="recommendation-item" key={`${recommendation.title}-${index}`}>
          <span className="recommendation-icon" aria-hidden="true">{recommendation.icon}</span>
          <div><h3>{recommendation.title}</h3><p>{recommendation.message}</p></div>
        </article>)}</div>
        <p className="recommendations-note">ההמלצות מבוססות על תגובות ששמרת ועל האתרים שהיו פעילים בהם.</p>
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.progress ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('progress') }}>
      <section className="progress-section" id="progress" aria-labelledby="progress-title">
        <div className="statistics-heading"><div><span className="section-kicker">הדרך שלך</span><h2 id="progress-title">ההתקדמות שלי</h2></div><span className={`user-badge ${currentBadge.className}`}><span className="badge-art" aria-hidden="true">{currentBadge.icon}</span><span className="badge-copy"><strong>{currentBadge.name}</strong><small>הדרגה הנוכחית</small></span></span>{sectionControls('progress', 'ההתקדמות שלי')}</div>
        <div className="progress-summary"><strong>{totalPoints}</strong><span>נקודות זכות</span></div>
        {nextBadge ? <><p className="next-badge-copy">עוד {nextBadge.min - totalPoints} נקודות לדרגת {nextBadge.name}</p><div className="progress-track" role="progressbar" aria-label="התקדמות לדרגה הבאה" aria-valuenow={badgeProgress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${badgeProgress}%` }} /></div><div className="progress-track-caption"><span>{badgeProgress}% מהדרך</span><span>{totalPoints} / {nextBadge.min} נקודות</span></div></> : <p className="next-badge-copy">הגעת לדרגה הגבוהה ביותר — כל הכבוד!</p>}
        <div className="badge-milestones">{BADGES.map((badge, index) => <div key={badge.className} className={`badge-milestone ${totalPoints >= badgeThresholds[index] ? 'earned' : ''} ${index === currentBadgeIndex ? 'current' : ''}`}><span className="badge-milestone-icon">{badge.icon}</span><strong>{badge.name}</strong><small>{badgeThresholds[index]} נקודות</small><span className="badge-milestone-state">{index === currentBadgeIndex ? 'הדרגה שלך' : totalPoints >= badgeThresholds[index] ? 'הושגה' : 'בדרך'}</span></div>)}</div>
      </section>

      <section className="progress-details" aria-label="פירוט נקודות ופעילות הבלוג">
        <div className="points-breakdown">
          <h3>איך צוברים נקודות?</h3>
          <div><span>תגובות ששמרתי · נקודה לכל תגובה</span><strong>+{pointsFromSavedComments}</strong></div>
          <div><span>לייקים לתגובות שלי · 2 נקודות לכל לייק</span><strong>+{pointsFromCommentLikes}</strong></div>
          <div><span>דיסלייקים לתגובות שלי · מינוס 2 לכל דיסלייק</span><strong>{pointsFromCommentDislikes}</strong></div>
          <div><span>פרסים על השלמת משימות</span><strong>+{taskRewardPoints}</strong></div>
          <div><span>פוסטים ששיתפתי בבלוג · 5 נקודות לפוסט</span><strong>+{pointsFromBlogPosts}</strong></div>
          <div><span>תגובות שקיבלתי בבלוג · 2 נקודות לכל תגובה</span><strong>+{pointsFromBlogComments}</strong></div>
          <div><span>לייקים חיוביים בבלוג · 2 נקודות לכל לייק</span><strong>+{pointsFromBlogLikes}</strong></div>
          <div><span>דיסלייקים בבלוג · מינוס 2 לכל דיסלייק</span><strong>{pointsFromBlogDislikes}</strong></div>
          {rawPoints < 0 && <small>הניקוד לא יורד מתחת לאפס.</small>}
        </div>
        <div className="blog-activity-panel">
          <h3>פעילות הבלוג</h3>
          <p>הנתונים מתעדכנים אוטומטית לפי הפוסטים והתגובות בבלוג.</p>
          <div className="blog-activity-grid">
            <div className="blog-count"><span>פוסטים שפורסמו</span><strong>{myBlogPosts.length}</strong></div>
            <div className="blog-count"><span>תגובות שהתקבלו</span><strong>{blogCommentsCount}</strong></div>
            <div className="blog-count"><span>לייקים לפוסטים</span><strong>{totalBlogLikes}</strong></div>
            <div className="blog-count"><span>דיסלייקים לפוסטים</span><strong>{totalBlogDislikes}</strong></div>
          </div>
        </div>
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.blog ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('blog') }}>
      <section className="blog-section" id="blog" aria-labelledby="blog-title">
        <div className="statistics-heading"><div><span className="section-kicker">המילים שלך</span><h2 id="blog-title">הבלוג שלי</h2></div><span className="statistics-period">{myBlogPosts.length} פוסטים</span>{sectionControls('blog', 'הבלוג שלי')}</div>
        <label className="blog-search"><span>חיפוש בבלוג שלי</span><input type="search" value={myBlogSearchText} onChange={event => setMyBlogSearchText(event.target.value)} placeholder="כותרת, תוכן או תגובה..." aria-label="חיפוש בבלוג שלי" /><small>{filteredMyBlogPosts.length} מתוך {myBlogPosts.length} פוסטים</small></label>
        <div className="blog-filter-row" aria-label="סינון פוסטים לפי כותב ותאריך">
          <label className="blog-filter-field blog-author-filter"><span>כותב</span><select value={myBlogAuthorFilter} onChange={event => setMyBlogAuthorFilter(event.target.value)}><option value="all">כל הכינויים שלי</option>{myBlogAuthors.map(author => <option key={author} value={author}>{author}</option>)}</select></label>
          <label className="blog-filter-field"><span>מתאריך</span><input type="date" value={myBlogDateRange.from} max={myBlogDateRange.to || undefined} onChange={event => setMyBlogDateRange(previous => ({ ...previous, from: event.target.value }))} /></label>
          <label className="blog-filter-field"><span>עד תאריך</span><input type="date" value={myBlogDateRange.to} min={myBlogDateRange.from || undefined} onChange={event => setMyBlogDateRange(previous => ({ ...previous, to: event.target.value }))} /></label>
          {(myBlogAuthorFilter !== 'all' || myBlogDateRange.from || myBlogDateRange.to) && <button className="blog-filter-reset" type="button" onClick={() => { setMyBlogAuthorFilter('all'); setMyBlogDateRange({ from: '', to: '' }); }}>ניקוי סינון</button>}
        </div>
        <label className="blog-sort-control"><span>מיון פוסטים</span><select value={blogSortOrder} onChange={event => setBlogSortOrder(event.target.value)} aria-label="מיון פוסטים"><option value="newest">חדש ביותר</option><option value="popular">פופולרי ביותר</option></select></label>
        {!nickname && <p className="blog-author-note">בחרו כינוי בחלק העליון של העמוד כדי לפרסם פוסט בשם שלכם.</p>}
        <form className={`blog-compose ${isBlogFormOpen ? 'is-open' : ''}`} onSubmit={createBlogPost}>
          <button className="blog-compose-toggle" type="button" aria-expanded={isBlogFormOpen} onClick={() => setIsBlogFormOpen(open => !open)}>
            <span><span className="section-kicker">{editingBlogPostId ? 'עריכת פוסט' : 'פוסט חדש'}</span><strong>{editingBlogPostId ? 'עדכון הפוסט' : 'פרסום פוסט חדש'}</strong></span>
            <span className={`toggle-icon ${isBlogFormOpen ? 'is-open' : ''}`} aria-hidden="true">⌄</span>
          </button>
          <div className={`blog-compose-content ${isBlogFormOpen ? 'is-open' : ''}`} aria-hidden={!isBlogFormOpen}>
          <label>כותרת הפוסט<input maxLength="160" required value={blogDraft.title} onChange={event => setBlogDraft(previous => ({ ...previous, title: event.target.value }))} placeholder="על מה בא לך לכתוב?" /></label>
          <label>תוכן הפוסט<textarea maxLength="10000" required value={blogDraft.content} onChange={event => setBlogDraft(previous => ({ ...previous, content: event.target.value }))} placeholder="שתף מחשבות, רעיונות או סיפור..." /></label>
          <label>קישור לכתבה המקורית (לא חובה)<input type="url" maxLength="2048" value={blogDraft.sourceUrl} onChange={event => setBlogDraft(previous => ({ ...previous, sourceUrl: event.target.value }))} placeholder="https://example.com/article" dir="ltr" /></label>
          <div className="blog-compose-actions">
            <button className="primary-button" type="submit">{editingBlogPostId ? 'שמירת שינויים' : 'פרסום פוסט · 5 נקודות'}</button>
            <button className="blog-cancel-button" type="button" onClick={cancelBlogDraft}>{editingBlogPostId ? 'ביטול עריכה' : 'ביטול'}</button>
          </div>
          </div>
        </form>
        {filteredMyBlogPosts.length ? <div className="blog-post-list">{filteredMyBlogPosts.map(post => renderBlogPost(post, true))}</div> : <div className="empty-state blog-empty"><span>✎</span><h3>{myBlogPosts.length ? 'לא נמצאו פוסטים מתאימים' : nickname ? 'עוד לא פרסמת פוסט' : 'בחרו כינוי כדי להתחיל'}</h3><p>{myBlogPosts.length ? 'אפשר לשנות את החיפוש או את המסננים.' : 'פוסטים שתפרסם יופיעו כאן ובבלוג המגיבים, ויוסיפו 5 נקודות להתקדמות שלך.'}</p></div>}
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections['community-blog'] ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('community-blog') }}>
      <section className="blog-section community-blog-section" id="community-blog" aria-labelledby="community-blog-title">
        <div className="statistics-heading"><div><span className="section-kicker">כותבים וקוראים יחד</span><h2 id="community-blog-title">בלוג המגיבים</h2></div><span className="statistics-period">{communityBlogPosts.length} פוסטים</span>{sectionControls('community-blog', 'בלוג המגיבים')}</div>
        <label className="blog-search"><span>חיפוש בבלוג המגיבים</span><input type="search" value={communityBlogSearchText} onChange={event => setCommunityBlogSearchText(event.target.value)} placeholder="כותרת, כותב, תוכן או תגובה..." aria-label="חיפוש בבלוג המגיבים" /><small>{filteredCommunityBlogPosts.length} מתוך {communityBlogPosts.length} פוסטים</small></label>
        <div className="blog-filter-row" aria-label="סינון פוסטים לפי כותב ותאריך">
          <label className="blog-filter-field blog-author-filter"><span>כותב</span><select value={communityBlogAuthorFilter} onChange={event => setCommunityBlogAuthorFilter(event.target.value)}><option value="all">כל הכותבים</option>{blogAuthors.map(author => <option key={author} value={author}>{author}</option>)}</select></label>
          <label className="blog-filter-field"><span>מתאריך</span><input type="date" value={communityBlogDateRange.from} max={communityBlogDateRange.to || undefined} onChange={event => setCommunityBlogDateRange(previous => ({ ...previous, from: event.target.value }))} /></label>
          <label className="blog-filter-field"><span>עד תאריך</span><input type="date" value={communityBlogDateRange.to} min={communityBlogDateRange.from || undefined} onChange={event => setCommunityBlogDateRange(previous => ({ ...previous, to: event.target.value }))} /></label>
          {(communityBlogAuthorFilter !== 'all' || communityBlogDateRange.from || communityBlogDateRange.to) && <button className="blog-filter-reset" type="button" onClick={() => { setCommunityBlogAuthorFilter('all'); setCommunityBlogDateRange({ from: '', to: '' }); }}>ניקוי סינון</button>}
        </div>
        <label className="blog-sort-control"><span>מיון פוסטים</span><select value={blogSortOrder} onChange={event => setBlogSortOrder(event.target.value)} aria-label="מיון פוסטים"><option value="newest">חדש ביותר</option><option value="popular">פופולרי ביותר</option></select></label>
        <p className="blog-author-note">כאן מופיעים הפוסטים של כל הכותבים. אפשר להגיב ולדרג כל פוסט.</p>
        {filteredCommunityBlogPosts.length ? <div className="blog-post-list">{filteredCommunityBlogPosts.map(post => renderBlogPost(post, true))}</div> : <div className="empty-state blog-empty"><span>✎</span><h3>{communityBlogPosts.length ? 'לא נמצאו פוסטים מתאימים' : 'הבלוג הקהילתי עוד ריק'}</h3><p>{communityBlogPosts.length ? 'אפשר לשנות את החיפוש או את המסננים.' : 'פרסמו את הפוסט הראשון שלכם כדי להתחיל את השיחה.'}</p></div>}
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.leaderboard ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('leaderboard') }}>
      <section className="leaderboard-section" id="leaderboard" aria-labelledby="leaderboard-title">
        <div className="statistics-heading"><div><span className="section-kicker">הקהילה שלנו</span><h2 id="leaderboard-title">טבלת מגיבים עולמית</h2></div><span className="statistics-period">{globalLeaderboard.length} מגיבים</span>{sectionControls('leaderboard', 'טבלת מגיבים עולמית')}</div>
        <p className="leaderboard-intro">הדירוג מבוסס על נקודות ההתקדמות של כל משתמש.</p>
        {leaderboardLoading && !globalLeaderboard.length ? <p className="leaderboard-status">טוען את דירוג המגיבים…</p>
          : leaderboardError ? <div className="leaderboard-status is-error" role="alert">{leaderboardError}<button type="button" onClick={loadGlobalLeaderboard}>נסו שוב</button></div>
            : globalLeaderboard.length ? <div className="leaderboard-table-wrap"><table className="leaderboard-table" aria-label="דירוג המגיבים לפי ניקוד">
              <thead><tr><th scope="col">מקום</th><th scope="col">מגיב/ה</th><th scope="col">נקודות</th><th scope="col">דרגה</th></tr></thead>
              <tbody>{globalLeaderboard.map(user => {
                const avatar = AVATARS.find(item => item.id === user.avatarId) || AVATARS[0];
                return <tr key={user.id} className={user.id === currentUser.id ? 'is-current-user' : ''}>
                  <td className="leaderboard-position" data-label="מקום"><span>{user.position <= 3 ? ['🥇', '🥈', '🥉'][user.position - 1] : user.position}</span></td>
                  <td className="leaderboard-user-cell" data-label="מגיב/ה"><button className="leaderboard-user-link" type="button" onClick={() => openPublicProfile(user.id)}><span className="leaderboard-avatar" aria-hidden="true">{avatar.emoji}</span><strong>{user.displayName || 'מגיב/ה'}</strong>{user.id === currentUser.id && <small>זה/זו אני</small>}</button></td>
                  <td className="leaderboard-points" data-label="נקודות"><strong>{user.points}</strong></td>
                  <td className="leaderboard-rank-cell" data-label="דרגה"><span className={`leaderboard-rank ${user.rank.className}`}><i aria-hidden="true">{user.rank.icon}</i>{user.rank.name}</span></td>
                </tr>;
              })}</tbody>
            </table></div>
            : <div className="leaderboard-status">עדיין אין משתמשים בדירוג.</div>}
        <button className="leaderboard-refresh" type="button" onClick={loadGlobalLeaderboard} disabled={leaderboardLoading}>{leaderboardLoading ? 'מעדכן…' : 'רענון הדירוג'}</button>
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.settings ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('settings') }}>
      <section className="settings-section" id="settings" aria-labelledby="settings-title">
        <div className="statistics-heading"><div><span className="section-kicker">החשבון שלך</span><h2 id="settings-title">הגדרות</h2></div>{sectionControls('settings', 'הגדרות')}</div>
        <div className="settings-grid">
          <article className="settings-card">
            <div className="settings-card-heading"><span aria-hidden="true">👤</span><div><h3>פרטי החשבון</h3><p>הפרטים שמחוברים לחשבון שלך</p></div></div>
            <label className="settings-field">כתובת אימייל<input type="email" value={currentUser.email} readOnly dir="ltr" /></label>
            <form className="settings-profile-form" onSubmit={event => { event.preventDefault(); saveNickname(); }}>
              <label className="settings-field">הכינוי שלך<input maxLength="80" required value={nicknameDraft} onChange={event => setNicknameDraft(event.target.value)} placeholder="הקלידו כינוי" /></label>
              <button className="primary-button" type="submit">שמירת כינוי</button>
            </form>
            <div className="settings-avatar-picker">
              <div className="settings-avatar-heading"><strong>האווטר שלך</strong><span>בחר/י דמות שתופיע בפרופיל הציבורי</span></div>
              <div className="settings-avatar-options" role="group" aria-label="בחירת אווטר">
                {AVATARS.map(avatar => <button type="button" key={avatar.id} className={`settings-avatar-option ${currentUser.avatarId === avatar.id || (!currentUser.avatarId && avatar.id === 'comment-bubble') ? 'selected' : ''}`} aria-pressed={currentUser.avatarId === avatar.id || (!currentUser.avatarId && avatar.id === 'comment-bubble')} aria-label={avatar.label} title={avatar.label} disabled={avatarSaving} onClick={() => changeAvatar(avatar.id)}>
                  <span className="settings-avatar-face">{avatar.emoji}</span><span className="avatar-reply-mark" aria-hidden="true">↩</span><small>{avatar.label}</small>
                </button>)}
              </div>
              {avatarSaveStatus && <small className={`avatar-save-status ${avatarSaving ? 'is-saving' : ''}`} role="status">{avatarSaveStatus}</small>}
            </div>
          </article>
          <article className="settings-card">
            <div className="settings-card-heading"><span aria-hidden="true">◐</span><div><h3>מראה האתר</h3><p>בחר/י את ערכת הנושא שלך</p></div></div>
            <div className="settings-theme-options" role="group" aria-label="בחירת ערכת נושא">
              {themes.map(option => <button type="button" key={option.value} className={`settings-theme-option ${theme === option.value ? 'selected' : ''}`} aria-pressed={theme === option.value} onClick={() => changeTheme(option.value)}>
                <span className="settings-theme-swatch" style={{ background: option.swatch }} aria-hidden="true" />{option.label}{theme === option.value && <span className="settings-theme-check" aria-hidden="true">✓</span>}
              </button>)}
            </div>
          </article>
          <article className="settings-card settings-account-card">
            <div className="settings-card-heading"><span aria-hidden="true">↗</span><div><h3>ניהול החשבון</h3><p>יציאה מהמכשיר הזה</p></div></div>
            <button className="settings-sign-out" onClick={signOut}>יציאה מהחשבון</button>
          </article>
        </div>
      </section>
      </div>

      <div className={`dashboard-panel comments-dashboard-panel ${collapsedDashboardSections.comments ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('comments') }} id="comments">
      <div className="comments-dashboard-heading"><div><span className="section-kicker">הספרייה שלך</span><h2>התגובות שלי</h2></div>{sectionControls('comments', 'התגובות שלי')}</div>
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
              {conversation.yourComment && <p className="comment-quote" data-comment-id={conversation._id}>“{conversation.yourComment}”</p>}
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
                  <button className="card-update-button" title="סמן קטע מהתגובה כדי להוסיף רק אותו; אחרת תתווסף כל התגובה" onMouseDown={event => event.preventDefault()} onClick={() => addSavedCommentToBlog(conversation)}>הוסף לבלוג</button>
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
      </div>
      </div>

      {isPublicProfileOpen && <div className="profile-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setIsPublicProfileOpen(false); }}>
        <section className="public-profile-modal" role="dialog" aria-modal="true" aria-labelledby="public-profile-title">
          <div className="public-profile-heading">
            <div className="public-profile-avatar" aria-hidden="true"><span>{AVATARS.find(avatar => avatar.id === publicProfile?.avatarId)?.emoji || AVATARS[0].emoji}</span><i>↩</i></div>
            <div className="public-profile-title-group"><span className="section-kicker">פרופיל ציבורי</span><h2 id="public-profile-title">{publicProfileLoading ? 'טוען פרופיל…' : publicProfile?.displayName || 'פרופיל משתמש'}</h2>{publicProfile && <><small>{publicProfile.posts.length} פוסטים שפורסמו</small><div className="public-profile-meta">
              {publicProfile.rank && <span className={`user-badge public-profile-rank ${publicProfile.rank.className}`}><span className="badge-art" aria-hidden="true">{publicProfile.rank.icon}</span><span className="badge-copy"><strong>{publicProfile.rank.name}</strong><small>דרגת המגיב</small></span></span>}
              {publicProfile.joinedAt && <span className="public-profile-tenure">מגיב באתר מתאריך {new Date(publicProfile.joinedAt).toLocaleDateString('he-IL')}</span>}
            </div></>}</div>
            <button className="profile-modal-close" type="button" aria-label="סגירת הפרופיל" onClick={() => setIsPublicProfileOpen(false)}>×</button>
          </div>
          {publicProfileError && <p className="public-profile-message error">{publicProfileError}</p>}
          {publicProfileLoading && <p className="public-profile-message">טוען את הפוסטים…</p>}
          {publicProfile && (publicProfile.posts.length
            ? <div className="blog-post-list public-profile-posts">{publicProfile.posts.map(post => renderBlogPost(post, false))}</div>
            : <div className="empty-state public-profile-empty"><h3>עדיין אין פוסטים</h3><p>הפוסטים שיפורסמו יופיעו כאן.</p></div>)}
        </section>
      </div>}
      <footer className="app-footer">© All rights reserved to Eliran Takiya</footer>
    </div>
  );
}

export default App;
