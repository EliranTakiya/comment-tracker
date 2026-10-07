import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

axios.defaults.withCredentials = true;
const API_BASE_URL = '';

const TOPICS = ['חדשות כללי', 'ספורט', 'כלכלה', 'פוליטיקה', 'אופנה', 'סלבס'];
const TOPIC_CHALLENGE_BADGE_IDS = ['news-general', 'sports', 'economy', 'politics', 'fashion', 'celebrities'];
const TOPIC_CHALLENGE_ICONS = ['◉', '⬟', '⌁', '✥', '❖', '◌'];
const getTopicChallengeBadge = badgeId => {
  const index = TOPIC_CHALLENGE_BADGE_IDS.indexOf(badgeId);
  return index < 0 ? null : { topic: TOPICS[index], icon: TOPIC_CHALLENGE_ICONS[index], index };
};
const DATE_FILTERS = [
  { value: 'all', label: 'כל התאריכים' },
  { value: 'today', label: 'היום' },
  { value: 'week', label: 'השבוע האחרון' },
  { value: 'month', label: 'החודש האחרון' },
  { value: 'custom', label: 'תאריך מסוים' },
];
const emptyForm = { siteName: '', siteUrl: '', pageTitle: '', commentId: '', yourComment: '', hint: 'חדשות כללי' };
const themes = [
  { value: 'day', label: 'שנהב חמים', swatch: 'linear-gradient(135deg, #f3e8d7, #fbf2e6)' },
  { value: 'midday', label: 'אפרסק בהיר', swatch: 'linear-gradient(135deg, #f7ded0, #fff0e5)' },
  { value: 'night', label: 'דמדומים', swatch: 'linear-gradient(135deg, #36364c, #5b536e)' },
  { value: 'glow', label: 'ורד רך', swatch: 'linear-gradient(135deg, #f4dce2, #fbeef0)' },
];
const IDENTITY_DIRECTIONS = [
  { id: 'crest-of-the-voice', name: 'סמל הקול', icon: '✦', description: 'הסמל האישי שלך' },
  { id: 'the-axis', name: 'הציר', icon: '◇', description: 'נבנה מתגובות ששמרת', unlock: stats => stats.comments >= 20, progress: stats => ({ value: Math.min(stats.comments, 20), goal: 20, detail: `${Math.min(stats.comments, 20)} מתוך 20 תגובות שמורות` }) },
  { id: 'the-bloom', name: 'הפריחה', icon: '✿', description: 'נבנית מרעיונות שפיתחת', unlock: stats => stats.ideas >= 3 && stats.ideaEntries >= 5, progress: stats => ({ value: Math.min(stats.ideas / 3, stats.ideaEntries / 5) * 100, goal: 100, detail: `${Math.min(stats.ideas, 3)} מתוך 3 רעיונות · ${Math.min(stats.ideaEntries, 5)} מתוך 5 פריטים בציר` }) },
  { id: 'the-mark', name: 'החותם', icon: '⌑', description: 'נבנה ממילים שפרסמת', unlock: stats => stats.posts >= 5, progress: stats => ({ value: Math.min(stats.posts, 5), goal: 5, detail: `${Math.min(stats.posts, 5)} מתוך 5 פוסטים שפרסמת` }) },
  { id: 'the-crown', name: 'הכתר', icon: '♛', description: 'נבנה משיחות ותגובות שקיבלת', unlock: stats => stats.engagements >= 30, progress: stats => ({ value: Math.min(stats.engagements, 30), goal: 30, detail: `${Math.min(stats.engagements, 30)} מתוך 30 תגובות ומעורבויות` }) },
  { id: 'the-orbit', name: 'המסלול', icon: '◎', description: 'נבנה מפעילות בשלושה נושאים', unlock: stats => stats.activeTopics >= 3, progress: stats => ({ value: Math.min(stats.activeTopics, 3), goal: 3, detail: `${Math.min(stats.activeTopics, 3)} מתוך 3 נושאים עם תגובות` }) },
  { id: 'the-prism', name: 'המנסרה', icon: '⬡', description: 'נבנית מפעילות בכל ששת הנושאים', unlock: stats => stats.activeTopics >= 6, progress: stats => ({ value: Math.min(stats.activeTopics, 6), goal: 6, detail: `${Math.min(stats.activeTopics, 6)} מתוך 6 נושאים עם תגובות` }) },
  { id: 'the-seal', name: 'חותם הדרך', icon: '◈', description: 'נבנה מהשלמת אתגרים', unlock: stats => stats.completedMissions >= 10, progress: stats => ({ value: Math.min(stats.completedMissions, 10), goal: 10, detail: `${Math.min(stats.completedMissions, 10)} מתוך 10 משימות שהושלמו` }) },
  { id: 'the-thread', name: 'החוט', icon: '⌘', description: 'נבנה מחיבור פריטים לרעיונות', unlock: stats => stats.ideaEntries >= 10, progress: stats => ({ value: Math.min(stats.ideaEntries, 10), goal: 10, detail: `${Math.min(stats.ideaEntries, 10)} מתוך 10 פריטים שחוברו לרעיונות` }) },
  { id: 'the-sigil', name: 'הסימן', icon: '✺', description: 'נבנה משבעה ימי פעילות רצופים', unlock: stats => stats.activityStreak >= 7, progress: stats => ({ value: Math.min(stats.activityStreak, 7), goal: 7, detail: `${Math.min(stats.activityStreak, 7)} מתוך 7 ימים ברצף` }) },
];
const getIdentityDirection = directionId => IDENTITY_DIRECTIONS.find(direction => direction.id === directionId) || null;
const CREST_UNLOCK_POINTS = 20;
const TOPIC_CHALLENGE_GOAL = 5;
const ACTIVITY_LEVELS = [
  { name: 'מתחיל', icon: '○', min: 0, className: 'beginner' },
  { name: 'מגיב פעיל', icon: '✦', min: 20, className: 'active' },
  { name: 'טוקבקיסט', icon: '◆', min: 60, className: 'commenter' },
  { name: 'טוקבקיסט ותיק', icon: '★', min: 150, className: 'veteran' },
  { name: 'טוקבקיסט על', icon: '✹', min: 300, className: 'super' },
];

const getLocalDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const normalizeSiteName = (siteName) => String(siteName || '').trim().toLocaleLowerCase();
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
  const [ideas, setIdeas] = useState([]);
  const [selectedIdeaId, setSelectedIdeaId] = useState('');
  const [ideaTitleDraft, setIdeaTitleDraft] = useState('');
  const [ideaEntryKind, setIdeaEntryKind] = useState('conversation');
  const [ideaEntryTargetId, setIdeaEntryTargetId] = useState('');
  const [ideaEntryNote, setIdeaEntryNote] = useState('');
  const [ideaLinkConversationId, setIdeaLinkConversationId] = useState('');
  const [ideaLinkSelectedIdeaId, setIdeaLinkSelectedIdeaId] = useState('');
  const [ideaLinkNewTitle, setIdeaLinkNewTitle] = useState('');
  const [ideaLinkNote, setIdeaLinkNote] = useState('');
  const [ideaLinkPostId, setIdeaLinkPostId] = useState('');
  const [ideaLinkPostIdeaId, setIdeaLinkPostIdeaId] = useState('');
  const [ideaLinkPostNewTitle, setIdeaLinkPostNewTitle] = useState('');
  const [ideaLinkPostNote, setIdeaLinkPostNote] = useState('');
  const [ideaNoteDrafts, setIdeaNoteDrafts] = useState({});
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');
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
  const [myBlogSiteFilter, setMyBlogSiteFilter] = useState('all');
  const [myBlogTopicFilter, setMyBlogTopicFilter] = useState('all');
  const [communityBlogAuthorFilter, setCommunityBlogAuthorFilter] = useState('all');
  const [communityBlogSiteFilter, setCommunityBlogSiteFilter] = useState('all');
  const [communityBlogTopicFilter, setCommunityBlogTopicFilter] = useState('all');
  const [communityBlogDateRange, setCommunityBlogDateRange] = useState({ from: '', to: '' });
  const [blogSortOrder, setBlogSortOrder] = useState('newest');
  const [successMessage, setSuccessMessage] = useState('');
  const successTimerRef = useRef(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBlogFormOpen, setIsBlogFormOpen] = useState(false);
  const dashboardSectionIds = ['progress', 'statistics', 'tasks', 'ideas', 'recommendations', 'blog', 'community-blog', 'leaderboard', 'settings', 'comments'];
  const [dashboardOrder, setDashboardOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('comment-tracker-section-order') || 'null');
      if (!Array.isArray(saved)) return dashboardSectionIds;
      const knownSavedIds = [...new Set(saved.filter(id => dashboardSectionIds.includes(id)))];
      return [...knownSavedIds, ...dashboardSectionIds.filter(id => !knownSavedIds.includes(id))];
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
  const [identitySaving, setIdentitySaving] = useState(false);
  const [featuredBadgeSaving, setFeaturedBadgeSaving] = useState(false);
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

  useEffect(() => {
    if (!currentUser) {
      setIdeas([]);
      setSelectedIdeaId('');
      setIdeasLoading(false);
      return undefined;
    }
    let active = true;
    setIdeasLoading(true);
    setIdeasError('');
    axios.get(`${API_BASE_URL}/api/ideas`)
      .then(response => {
        if (!active) return;
        const loadedIdeas = response.data;
        setIdeas(loadedIdeas);
        setSelectedIdeaId(previous => loadedIdeas.some(idea => idea._id === previous) ? previous : loadedIdeas[0]?._id || '');
      })
      .catch(err => {
        console.error('Load ideas error:', err.response?.data || err.message);
        if (active) setIdeasError('לא הצלחנו לטעון את מסע הרעיונות. נסו לרענן.');
      })
      .finally(() => { if (active) setIdeasLoading(false); });
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
    setIdeas([]);
    setSelectedIdeaId('');
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
    const previousTheme = theme;
    setTheme(nextTheme);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, { theme: nextTheme });
      setCurrentUser(response.data.user);
      showSuccess('ערכת הנושא נשמרה');
    } catch (err) {
      console.error('Save theme error:', err.response?.data || err.message);
      setTheme(previousTheme);
      showSuccess('שמירת ערכת הנושא נכשלה');
    }
  };

  const changeFeaturedBadge = async (badgeId) => {
    if (featuredBadgeSaving) return;
    setFeaturedBadgeSaving(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, {
        selectedChallengeBadgeId: badgeId || null,
      });
      setCurrentUser(response.data.user);
      showSuccess(badgeId ? 'הבאדג׳ נבחר לצד הכינוי' : 'הבאדג׳ הוסר מהכינוי');
    } catch (err) {
      console.error('Save featured badge error:', err.response?.data || err.message);
      showSuccess(err.response?.data?.message || 'לא הצלחנו לשמור את הבאדג׳');
    } finally {
      setFeaturedBadgeSaving(false);
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

  const changeIdentityDirection = async (directionId) => {
    if (identitySaving) return;
    setIdentitySaving(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, {
        selectedIdentityDirection: directionId,
        identityMode: 'custom',
      });
      setCurrentUser(response.data.user);
      showSuccess('הסמל ננעץ על הענף שבחרת');
    } catch (err) {
      console.error('Save identity direction error:', err.response?.data || err.message);
      showSuccess('לא הצלחנו לשמור את בחירת הסמל');
    } finally {
      setIdentitySaving(false);
    }
  };

  const changeIdentityMode = async (identityMode) => {
    if (identitySaving || currentUser?.identityMode === identityMode) return;
    setIdentitySaving(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/api/auth/profile`, { identityMode });
      setCurrentUser(response.data.user);
      showSuccess(identityMode === 'auto' ? 'הסמל יחזור להתפתח אוטומטית' : 'בחר ענף זהות כדי לנעוץ אותו');
    } catch (err) {
      console.error('Save identity mode error:', err.response?.data || err.message);
      showSuccess('לא הצלחנו לשנות את מצב התפתחות הסמל');
    } finally {
      setIdentitySaving(false);
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

  const createIdea = async (event) => {
    event.preventDefault();
    const title = ideaTitleDraft.trim();
    if (!title) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ideas`, { title });
      setIdeas(previous => [response.data, ...previous]);
      setSelectedIdeaId(response.data._id);
      setIdeaTitleDraft('');
      setIdeasError('');
      showSuccess('הרעיון נוצר');
    } catch (err) {
      console.error('Create idea error:', err.response?.data || err.message);
      setIdeasError(err.response?.data?.message || 'יצירת הרעיון נכשלה. נסו שוב.');
    }
  };

  const deleteIdea = async (idea) => {
    if (!window.confirm(`למחוק את הרעיון "${idea.title}" ואת ציר הזמן שלו?`)) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/ideas/${idea._id}`);
      setIdeas(previous => previous.filter(item => item._id !== idea._id));
      setSelectedIdeaId(previous => previous === idea._id ? (ideas.find(item => item._id !== idea._id)?._id || '') : previous);
      showSuccess('הרעיון נמחק');
    } catch (err) {
      console.error('Delete idea error:', err.response?.data || err.message);
      setIdeasError('מחיקת הרעיון נכשלה. נסו שוב.');
    }
  };

  const addIdeaEntry = async (event) => {
    event.preventDefault();
    if (!selectedIdeaId || !ideaEntryTargetId) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ideas/${selectedIdeaId}/entries`, {
        kind: ideaEntryKind,
        targetId: ideaEntryTargetId,
        note: ideaEntryNote,
      });
      setIdeas(previous => previous.map(idea => idea._id === response.data._id ? response.data : idea));
      setIdeaEntryTargetId('');
      setIdeaEntryNote('');
      showSuccess('הפריט צורף למסע הרעיון');
    } catch (err) {
      console.error('Add idea entry error:', err.response?.data || err.message);
      setIdeasError(err.response?.data?.message || 'צירוף הפריט נכשל. נסו שוב.');
    }
  };

  const saveIdeaNote = async (idea, entry, note) => {
    const nextNote = note.trim();
    if (nextNote === (entry.note || '')) return;
    try {
      const response = await axios.put(`${API_BASE_URL}/api/ideas/${idea._id}/entries/${entry._id}`, { note: nextNote });
      setIdeas(previous => previous.map(item => item._id === response.data._id ? response.data : item));
      setIdeaNoteDrafts(previous => {
        const next = { ...previous };
        delete next[`${idea._id}:${entry._id}`];
        return next;
      });
      showSuccess('ההערה האישית נשמרה');
    } catch (err) {
      console.error('Save idea note error:', err.response?.data || err.message);
      setIdeasError('שמירת ההערה נכשלה. נסו שוב.');
    }
  };

  const removeIdeaEntry = async (idea, entry) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/ideas/${idea._id}/entries/${entry._id}`);
      setIdeas(previous => previous.map(item => item._id === response.data._id ? response.data : item));
      showSuccess('הפריט הוסר מציר הזמן');
    } catch (err) {
      console.error('Remove idea entry error:', err.response?.data || err.message);
      setIdeasError('הסרת הפריט נכשלה. נסו שוב.');
    }
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
      <div className="blog-post-heading"><div><h3>{post.title}</h3>{post.ownerId ? <button className="blog-post-author" onClick={() => openPublicProfile(post.ownerId)}>מאת {post.author || 'חבר/ת קהילה'}</button> : <span className="blog-post-author">מאת {post.author || 'חבר/ת קהילה'}</span>}<span className="saved-date">פורסם {new Date(post.createdAt).toLocaleDateString('he-IL')}</span></div>{isMyPost && <div className="blog-post-controls"><button className="edit-blog-button" onClick={() => startBlogPostEdit(post)}>עריכת פוסט</button><button className="card-update-button blog-idea-trigger" type="button" aria-expanded={ideaLinkPostId === post._id} onClick={() => ideaLinkPostId === post._id ? setIdeaLinkPostId('') : startIdeaLinkForPost(post)}>שייך לרעיון</button><button className="delete-button" onClick={() => deleteBlogPost(post)}>מחיקת פוסט</button></div>}</div>
      <p className="blog-post-content">{post.content}</p>
      {ideaLinkPostId === post._id && isMyPost && <form className="comment-idea-link-form blog-idea-link-form" onSubmit={event => ideas.length ? linkBlogPostToIdea(event, post) : createIdeaAndLinkBlogPost(event, post)}>
        {ideas.length ? <label><span>בחירת רעיון</span><select required value={ideaLinkPostIdeaId} onChange={event => setIdeaLinkPostIdeaId(event.target.value)}><option value="">בחרו רעיון</option>{ideas.map(idea => <option key={idea._id} value={idea._id}>{idea.title}</option>)}</select></label>
          : <label><span>שם הרעיון הראשון</span><input required maxLength="100" value={ideaLinkPostNewTitle} onChange={event => setIdeaLinkPostNewTitle(event.target.value)} placeholder="למשל: תחבורה ציבורית בשבת" /></label>}
        <label className="comment-idea-note"><span>הערה אישית <small>פרטית לך בלבד</small></span><textarea maxLength="500" rows="2" value={ideaLinkPostNote} onChange={event => setIdeaLinkPostNote(event.target.value)} placeholder="מה חשבת על הרעיון כשכתבת את הפוסט? (לא חובה)" /></label>
        <div className="comment-idea-form-actions"><button className="idea-add-button" type="submit" disabled={ideas.length ? !ideaLinkPostIdeaId : !ideaLinkPostNewTitle.trim()}>{ideas.length ? 'הוסף למסע הרעיון' : 'צור רעיון והוסף פוסט'}</button><button className="comment-idea-cancel" type="button" onClick={() => setIdeaLinkPostId('')}>ביטול</button></div>
      </form>}
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

  const cancelConversationEdit = () => {
    setEditingConversationId(null);
    setForm(emptyForm);
    setIsFormOpen(false);
  };

  const startIdeaLink = (conversation) => {
    setIdeaLinkConversationId(conversation._id);
    setIdeaLinkSelectedIdeaId(selectedIdeaId || ideas[0]?._id || '');
    setIdeaLinkNewTitle('');
    setIdeaLinkNote('');
  };

  const linkConversationToIdea = async (event, conversation) => {
    event.preventDefault();
    if (!ideaLinkSelectedIdeaId) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ideas/${ideaLinkSelectedIdeaId}/entries`, {
        kind: 'conversation',
        targetId: conversation._id,
        note: ideaLinkNote,
      });
      setIdeas(previous => previous.map(idea => idea._id === response.data._id ? response.data : idea));
      setSelectedIdeaId(response.data._id);
      setIdeaLinkConversationId('');
      setIdeaLinkNote('');
      showSuccess('התגובה וההערה נוספו למסע הרעיון');
    } catch (err) {
      console.error('Link saved comment to idea error:', err.response?.data || err.message);
      const message = err.response?.status === 409 ? 'התגובה כבר משויכת לרעיון הזה.' : err.response?.data?.message || 'שיוך התגובה לרעיון נכשל.';
      setIdeasError(message);
      showSuccess(message);
    }
  };

  const createIdeaAndLinkConversation = async (event, conversation) => {
    event.preventDefault();
    const title = ideaLinkNewTitle.trim();
    if (!title) return;
    try {
      const ideaResponse = await axios.post(`${API_BASE_URL}/api/ideas`, { title });
      const entryResponse = await axios.post(`${API_BASE_URL}/api/ideas/${ideaResponse.data._id}/entries`, {
        kind: 'conversation',
        targetId: conversation._id,
        note: ideaLinkNote,
      });
      setIdeas(previous => [entryResponse.data, ...previous]);
      setSelectedIdeaId(entryResponse.data._id);
      setIdeaLinkConversationId('');
      setIdeaLinkNewTitle('');
      setIdeaLinkNote('');
      showSuccess('הרעיון נוצר והתגובה נוספה למסע');
    } catch (err) {
      console.error('Create idea from saved comment error:', err.response?.data || err.message);
      showSuccess(err.response?.data?.message || 'יצירת הרעיון נכשלה. נסו שוב.');
    }
  };

  const startIdeaLinkForPost = (post) => {
    setIdeaLinkPostId(post._id);
    setIdeaLinkPostIdeaId(selectedIdeaId || ideas[0]?._id || '');
    setIdeaLinkPostNewTitle('');
    setIdeaLinkPostNote('');
  };

  const linkBlogPostToIdea = async (event, post) => {
    event.preventDefault();
    if (!ideaLinkPostIdeaId) return;
    try {
      const response = await axios.post(`${API_BASE_URL}/api/ideas/${ideaLinkPostIdeaId}/entries`, {
        kind: 'blogPost',
        targetId: post._id,
        note: ideaLinkPostNote,
      });
      setIdeas(previous => previous.map(idea => idea._id === response.data._id ? response.data : idea));
      setSelectedIdeaId(response.data._id);
      setIdeaLinkPostId('');
      setIdeaLinkPostNote('');
      showSuccess('הפוסט וההערה נוספו למסע הרעיון');
    } catch (err) {
      console.error('Link blog post to idea error:', err.response?.data || err.message);
      showSuccess(err.response?.status === 409 ? 'הפוסט כבר משויך לרעיון הזה.' : err.response?.data?.message || 'שיוך הפוסט לרעיון נכשל.');
    }
  };

  const createIdeaAndLinkBlogPost = async (event, post) => {
    event.preventDefault();
    const title = ideaLinkPostNewTitle.trim();
    if (!title) return;
    try {
      const ideaResponse = await axios.post(`${API_BASE_URL}/api/ideas`, { title });
      const entryResponse = await axios.post(`${API_BASE_URL}/api/ideas/${ideaResponse.data._id}/entries`, {
        kind: 'blogPost',
        targetId: post._id,
        note: ideaLinkPostNote,
      });
      setIdeas(previous => [entryResponse.data, ...previous]);
      setSelectedIdeaId(entryResponse.data._id);
      setIdeaLinkPostId('');
      setIdeaLinkPostNewTitle('');
      setIdeaLinkPostNote('');
      showSuccess('הרעיון נוצר והפוסט נוסף למסע');
    } catch (err) {
      console.error('Create idea from blog post error:', err.response?.data || err.message);
      showSuccess(err.response?.data?.message || 'יצירת הרעיון נכשלה. נסו שוב.');
    }
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
      const matchesSite = siteFilter === 'all' || normalizeSiteName(conversation.siteName) === siteFilter;
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

  const savedSites = [...convos.reduce((sites, conversation) => {
    const label = String(conversation.siteName || '').trim();
    const key = normalizeSiteName(label);
    if (!key) return sites;
    const site = sites.get(key) || { key, label, count: 0, spellingCounts: new Map() };
    site.count += 1;
    const spellingCount = (site.spellingCounts.get(label) || 0) + 1;
    site.spellingCounts.set(label, spellingCount);
    if (spellingCount > (site.spellingCounts.get(site.label) || 0)) site.label = label;
    sites.set(key, site);
    return sites;
  }, new Map()).values()].sort((first, second) => first.label.localeCompare(second.label, 'he'));
  const totalCommentLikes = convos.reduce((total, conversation) => total + (conversation.likesCount || 0), 0);
  const totalCommentDislikes = convos.reduce((total, conversation) => total + (conversation.dislikesCount || 0), 0);
  const pointsFromSavedComments = convos.length;
  const pointsFromCommentLikes = totalCommentLikes * 2;
  const pointsFromCommentDislikes = totalCommentDislikes * -2;
  const myBlogPosts = currentUser ? blogPosts.filter(post => String(post.ownerId || '') === currentUser.id) : [];
  const communityBlogPosts = [...blogPosts];
  const selectedIdea = ideas.find(idea => idea._id === selectedIdeaId) || null;
  const ideaTimelineEntries = selectedIdea ? selectedIdea.entries.map(entry => {
    const source = entry.kind === 'conversation'
      ? convos.find(conversation => String(conversation._id) === String(entry.targetId))
      : myBlogPosts.find(post => String(post._id) === String(entry.targetId));
    return { ...entry, source, sortDate: new Date(source?.createdAt || entry.addedAt) };
  }).sort((first, second) => first.sortDate - second.sortDate) : [];
  const myBlogAuthors = [...new Set(myBlogPosts.map(post => post.author?.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'he'));
  const blogAuthors = [...new Set(communityBlogPosts.map(post => post.author?.trim()).filter(Boolean))].sort((first, second) => first.localeCompare(second, 'he'));
  const matchesBlogSearch = (post, search) => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return true;
    const searchableText = [post.title, post.content, post.author, post.sourceTitle, post.sourceUrl,
      ...(post.comments || []).flatMap(comment => [comment.author, comment.content])].filter(Boolean).join(' ').toLocaleLowerCase();
    return searchableText.includes(query);
  };
  const getPostTopics = post => {
    if (post.sourceTopics?.length) return post.sourceTopics;
    const sourceIds = new Set((post.sourceConversationIds || []).map(String));
    return [...new Set(convos.filter(conversation => sourceIds.has(String(conversation._id))).map(conversation => conversation.hint).filter(Boolean))];
  };
  const getSiteDetails = (siteName, siteUrl) => {
    const name = String(siteName || '').trim();
    let host = '';
    try {
      if (siteUrl) host = new URL(siteUrl).hostname.replace(/^www\./i, '').toLocaleLowerCase();
    } catch {}
    const key = host || name.toLocaleLowerCase();
    return key ? { key, label: name || host } : null;
  };
  const getPostSites = post => {
    if (post.sourceSites?.length) return post.sourceSites;
    const sites = new Map();
    const sourceIds = new Set((post.sourceConversationIds || []).map(String));
    convos.filter(conversation => sourceIds.has(String(conversation._id))).forEach(conversation => {
      const site = getSiteDetails(conversation.siteName, conversation.siteUrl);
      if (site) sites.set(site.key, site);
    });
    const sourceSite = getSiteDetails('', post.sourceUrl);
    if (sourceSite && !sites.has(sourceSite.key)) sites.set(sourceSite.key, sourceSite);
    return [...sites.values()];
  };
  const getBlogSiteOptions = posts => {
    const sites = new Map();
    posts.forEach(post => getPostSites(post).forEach(site => {
      if (!sites.has(site.key)) sites.set(site.key, site);
    }));
    return [...sites.values()].sort((first, second) => first.label.localeCompare(second.label, 'he'));
  };
  const myBlogSites = getBlogSiteOptions(myBlogPosts);
  const communityBlogSites = getBlogSiteOptions(communityBlogPosts);
  const matchesBlogSite = (post, siteFilter) => {
    if (siteFilter === 'all') return true;
    const sites = getPostSites(post);
    return siteFilter === 'uncategorized' ? sites.length === 0 : sites.some(site => site.key === siteFilter);
  };
  const matchesBlogTopic = (post, topicFilter) => {
    if (topicFilter === 'all') return true;
    const topics = getPostTopics(post);
    return topicFilter === 'uncategorized' ? topics.length === 0 : topics.includes(topicFilter);
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
    && matchesBlogSite(post, myBlogSiteFilter)
    && matchesBlogTopic(post, myBlogTopicFilter)
    && (myBlogAuthorFilter === 'all' || post.author?.trim() === myBlogAuthorFilter)));
  const filteredCommunityBlogPosts = sortBlogPosts(communityBlogPosts.filter(post =>
    matchesBlogSearch(post, communityBlogSearchText)
    && matchesBlogDateRange(post, communityBlogDateRange)
    && matchesBlogSite(post, communityBlogSiteFilter)
    && matchesBlogTopic(post, communityBlogTopicFilter)
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
  const activityLevelIndex = ACTIVITY_LEVELS.reduce((result, level, index) => totalPoints >= level.min ? index : result, 0);
  const currentActivityLevel = ACTIVITY_LEVELS[activityLevelIndex];
  const nextActivityLevel = ACTIVITY_LEVELS[activityLevelIndex + 1] || null;
  const activityLevelProgress = nextActivityLevel
    ? Math.round(((totalPoints - currentActivityLevel.min) / (nextActivityLevel.min - currentActivityLevel.min)) * 100)
    : 100;
  const currentAvatar = AVATARS.find(avatar => avatar.id === currentUser?.avatarId) || AVATARS[0];
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
  const ideaEntriesCount = ideas.reduce((total, idea) => total + idea.entries.length, 0);
  const identityProgressPoints = totalPoints + ideas.length * 5 + ideaEntriesCount * 2;
  const identityProgress = Math.min(100, Math.round((identityProgressPoints / CREST_UNLOCK_POINTS) * 100));
  const crestEarned = identityProgressPoints >= CREST_UNLOCK_POINTS;
  const activeTopicCount = new Set(convos.map(conversation => conversation.hint || TOPICS[0])).size;
  const allConversationReplies = convos.reduce((total, conversation) => total + (conversation.repliesCount || 0), 0);
  const identityStats = {
    comments: convos.length,
    ideas: ideas.length,
    ideaEntries: ideaEntriesCount,
    posts: myBlogPosts.length,
    engagements: totalCommentLikes + allConversationReplies + totalBlogLikes + blogCommentsCount,
    activeTopics: activeTopicCount,
    completedMissions: taskRewards.claims.length,
    activityStreak,
  };
  const earnedIdentityDirections = crestEarned
    ? IDENTITY_DIRECTIONS.filter(direction => direction.id === 'crest-of-the-voice' || direction.unlock?.(identityStats))
    : [];
  const earnedIdentityDirectionIds = earnedIdentityDirections.map(direction => direction.id);
  const earnedIdentityDirectionKey = earnedIdentityDirectionIds.join('|');
  const currentUserId = currentUser?.id;
  const storedIdentityDirectionIds = currentUser?.unlockedIdentityDirections || [];
  const selectedIdentityDirection = IDENTITY_DIRECTIONS.find(direction => direction.id === currentUser?.selectedIdentityDirection)
    || IDENTITY_DIRECTIONS[0];
  const visibleIdentityDirection = earnedIdentityDirectionIds.includes(selectedIdentityDirection.id)
    || (crestEarned && storedIdentityDirectionIds.includes(selectedIdentityDirection.id))
    ? selectedIdentityDirection
    : IDENTITY_DIRECTIONS[0];
  const identityBadgeEntries = IDENTITY_DIRECTIONS.map(direction => ({
    direction,
    earned: direction.id === 'crest-of-the-voice'
      ? crestEarned
      : earnedIdentityDirectionIds.includes(direction.id) || storedIdentityDirectionIds.includes(direction.id),
    progress: direction.progress?.(identityStats),
  }));
  const earnedIdentityBadgeCount = identityBadgeEntries.filter(entry => entry.earned).length;
  const topicIdeaCounts = Object.fromEntries(TOPICS.map(topic => [topic, 0]));
  ideas.forEach(idea => idea.entries.forEach(entry => {
    const relatedConversationIds = entry.kind === 'conversation'
      ? [String(entry.targetId)]
      : (myBlogPosts.find(post => String(post._id) === String(entry.targetId))?.sourceConversationIds || []).map(String);
    const relatedTopics = new Set(convos
      .filter(conversation => relatedConversationIds.includes(String(conversation._id)))
      .map(conversation => conversation.hint || TOPICS[0]));
    relatedTopics.forEach(topic => { topicIdeaCounts[topic] = (topicIdeaCounts[topic] || 0) + 1; });
  }));
  const topicChallenges = TOPICS.map(topic => {
    const count = topicIdeaCounts[topic] || 0;
    const badgeId = TOPIC_CHALLENGE_BADGE_IDS[TOPICS.indexOf(topic)];
    const earnedAt = currentUser?.earnedChallengeBadges?.find(badge => badge.badgeId === badgeId)?.earnedAt || null;
    return { topic, badgeId, earnedAt, count, progress: Math.min(100, Math.round((count / TOPIC_CHALLENGE_GOAL) * 100)), earned: Boolean(earnedAt) || count >= TOPIC_CHALLENGE_GOAL };
  });
  const earnedTopicChallenges = topicChallenges.filter(challenge => challenge.earnedAt);
  const featuredChallengeBadge = topicChallenges.find(challenge => challenge.badgeId === currentUser?.selectedChallengeBadgeId)
    || [...earnedTopicChallenges].sort((first, second) => new Date(second.earnedAt || 0) - new Date(first.earnedAt || 0))[0]
    || null;
  const topicChallengeUnlockKey = topicChallenges.filter(challenge => challenge.count >= TOPIC_CHALLENGE_GOAL).map(challenge => challenge.badgeId).join('|');
  const topicMix = TOPICS.map(topic => ({
    topic,
    count: convos.filter(conversation => (conversation.hint || TOPICS[0]) === topic).length + (topicIdeaCounts[topic] || 0) * 2,
  }))
    .filter(item => item.count > 0);
  const topicMixTotal = topicMix.reduce((total, item) => total + item.count, 0) || 1;
  const topicMixGradient = topicMix.length
    ? `conic-gradient(${topicMix.map((item, index) => {
      const start = topicMix.slice(0, index).reduce((total, previous) => total + previous.count, 0) / topicMixTotal * 100;
      const end = start + item.count / topicMixTotal * 100;
      return `${['#c28a55', '#8390a0', '#aa7654', '#a9a08a', '#7e6c68', '#d0b78e'][TOPICS.indexOf(item.topic)]} ${start}% ${end}%`;
    }).join(', ')})`
    : 'conic-gradient(#4268d8 0% 30%, #934f9c 30% 53%, #ed7865 53% 76%, #d5a34e 76% 100%)';
  const missionItems = [
    { id: 'daily', icon: '◷', title: 'שמרו 3 תגובות היום', value: todaySavedComments, goal: 3, rewardPoints: 5, caption: `${todaySavedComments} מתוך 3` },
    { id: 'monthly', icon: '▦', title: 'שמרו 20 תגובות החודש', value: monthSavedComments, goal: 20, rewardPoints: 20, caption: `${monthSavedComments} מתוך 20 החודש` },
    { id: 'streak', icon: '↗', title: 'שמרו על רצף של 7 ימים', value: activityStreak, goal: 7, rewardPoints: 25, caption: `${activityStreak} מתוך 7 ימים ברצף` },
    { id: 'milestone', icon: '◇', title: 'הגיעו ל־50 תגובות שמורות', value: convos.length, goal: 50, rewardPoints: 50, caption: `${convos.length} מתוך 50 תגובות` },
  ];
  const taskTitleById = Object.fromEntries(missionItems.map(mission => [mission.id, mission.title]));
  useEffect(() => {
    if (!currentUserId) return undefined;
    let active = true;
    axios.get(`${API_BASE_URL}/api/auth/me`)
      .then(response => { if (active) setCurrentUser(response.data.user); })
      .catch(err => console.error('Sync earned achievements error:', err.response?.data || err.message));
    return () => { active = false; };
  }, [currentUserId, earnedIdentityDirectionKey, topicChallengeUnlockKey]);
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
  const siteComparisonRows = [...siteWeekActivity]
    .sort((first, second) => second.current + second.previous - first.current - first.previous)
    .slice(0, 5);
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
          <span className="beta-label" dir="ltr">(Beta)</span>
          {showThemeMenu && <div className="theme-menu">
            <strong>בחרו אווירה</strong>
            {themes.map(option => <button key={option.value} className={theme === option.value ? 'selected' : ''} onClick={() => changeTheme(option.value)}>
              <span className="theme-swatch" style={{ background: option.swatch }} />{option.label}
            </button>)}
          </div>}
        </div>
        <div className="hero-copy">
          <p className="eyebrow">COMMENT TRACKER</p>
          <h1>התגובות שלך, במקום אחד</h1>
          <p className="hero-subtitle">שומרים, מסננים וחוזרים בקלות לכל תגובה חשובה.</p>
          <div className="hero-count-compact"><strong>{convos.length}</strong><span>תגובות שמורות</span></div>
        </div>
        <div className="nickname-area hero-profile">
          <div className="hero-name-stack">
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
            <span className={`user-badge hero-activity-level ${currentActivityLevel.className}`} title={`רמת הפעילות: ${currentActivityLevel.name}`}>
              <span className="badge-art" aria-hidden="true">{currentActivityLevel.icon}</span>
              <span className="badge-copy"><strong>{currentActivityLevel.name}</strong><small>רמת פעילות</small></span>
            </span>
          </div>
          {crestEarned && <div className="user-badge identity-user-badge" title={`סמל הזהות שלי: ${visibleIdentityDirection.name}`}>
            <span className="identity-user-mark" aria-hidden="true" style={{ '--topic-mix': topicMixGradient }}>{visibleIdentityDirection.icon}</span>
            <span className="badge-copy"><strong>{visibleIdentityDirection.name}</strong><small>הסמל האישי שלך</small></span>
          </div>}
          {featuredChallengeBadge && <div className={`user-badge identity-user-badge featured-topic-badge topic-challenge-${TOPICS.indexOf(featuredChallengeBadge.topic)}`} title={`באדג׳ האתגר שלי: ${featuredChallengeBadge.topic}`}>
            <span className={`identity-user-mark challenge-mark-${TOPICS.indexOf(featuredChallengeBadge.topic)}`} aria-hidden="true">{TOPIC_CHALLENGE_ICONS[TOPICS.indexOf(featuredChallengeBadge.topic)]}</span>
            <span className="badge-copy"><strong>{featuredChallengeBadge.topic}</strong><small>באדג׳ אתגר</small></span>
          </div>}
        </div>
        <div className="hero-count"><strong>{convos.length}</strong><span>תגובות שמורות</span></div>
      </header>

      <nav className={`main-nav ${isMobileNavOpen ? 'is-open' : ''} ${isPublicProfileOpen ? 'is-profile-open' : ''}`} aria-label="ניווט ראשי">
        <button className="mobile-nav-toggle" type="button" aria-expanded={isMobileNavOpen} aria-controls="main-nav-links" onClick={() => setIsMobileNavOpen(open => !open)}>
          <span className={`hamburger-icon ${isMobileNavOpen ? 'is-open' : ''}`} aria-hidden="true"><i /><i /><i /></span>
          <span>{isMobileNavOpen ? 'סגירת תפריט' : 'ניווט באתר'}</span>
          <span className="nav-toggle-hint" aria-hidden="true">{isMobileNavOpen ? '×' : '⌄'}</span>
        </button>
        <div className={`main-nav-links ${isMobileNavOpen ? 'is-open' : ''}`} id="main-nav-links">
          <a className="nav-home" href="#home" onClick={event => navigateToSection(event, 'home')}>ראשי</a><a className="nav-comments" href="#comments" onClick={event => navigateToSection(event, 'comments')}>התגובות שלי</a><a className="nav-statistics" href="#statistics" onClick={event => navigateToSection(event, 'statistics')}>הסטטיסטיקות שלי</a><a className="nav-tasks" href="#tasks" onClick={event => navigateToSection(event, 'tasks')}>המשימות שלי</a><a className="nav-ideas" href="#ideas" onClick={event => navigateToSection(event, 'ideas')}>מסע הרעיונות</a><a className="nav-recommendations" href="#recommendations" onClick={event => navigateToSection(event, 'recommendations')}>המלצות אישיות</a><a className="nav-progress" href="#progress" onClick={event => navigateToSection(event, 'progress')}>ההתקדמות שלי</a><a className="nav-blog" href="#blog" onClick={event => navigateToSection(event, 'blog')}>הבלוג שלי</a><a className="nav-community" href="#community-blog" onClick={event => navigateToSection(event, 'community-blog')}>בלוג המגיבים</a><a className="nav-leaderboard" href="#leaderboard" onClick={event => navigateToSection(event, 'leaderboard')}>טבלת מגיבים</a><a className="nav-settings" href="#settings" onClick={event => navigateToSection(event, 'settings')}>הגדרות</a>
        </div>
      </nav>

      <section className={`crest-evolution ${crestEarned ? 'is-earned' : 'is-hidden'}`} id="identity" aria-labelledby="identity-title" style={{ '--topic-mix': topicMixGradient, '--crest-progress': `${identityProgress}%` }}>
        <div className={`crest-artwork crest-form-${visibleIdentityDirection.id}`} aria-hidden="true"><span className="crest-rim"><span className="crest-core"><span className="crest-core-fill" style={{ height: `${identityProgress}%` }} /><span className="crest-core-symbol">{crestEarned ? visibleIdentityDirection.icon : '·'}</span></span></span><span className="crest-orbit crest-orbit-one" /><span className="crest-orbit crest-orbit-two" /></div>
        <div className="crest-evolution-copy"><span className="section-kicker">{crestEarned ? 'הסמל הבסיסי שלך נפתח · הזהות ממשיכה להתפתח' : 'פרס מוחבא · זהות בהתהוות'}</span><h2 id="identity-title">{crestEarned ? visibleIdentityDirection.name : 'The Crest'}</h2><p>{crestEarned ? currentUser?.identityMode === 'custom' ? 'הסמל נעוץ על הענף שבחרת. בכל עת אפשר לחזור להתפתחות אוטומטית.' : 'הסמל משתנה אוטומטית כשהפעילות שלך פותחת ענפי זהות. אפשר גם לנעוץ ענף פתוח לבחירתך.' : 'כל תגובה, רעיון, פוסט ואתגר מוסיפים לסמל שכבה משלך.'}</p>
          <div className="crest-progress-heading"><span>{crestEarned ? 'הסמל נחשף' : 'התקדמות לחשיפה'}</span><strong>{identityProgress}%</strong></div><div className="progress-track crest-progress-track" role="progressbar" aria-label="התקדמות לחשיפת הסמל האישי" aria-valuenow={identityProgress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${identityProgress}%` }} /></div>
          <div className="crest-topic-signature">{TOPICS.map((topic, index) => <span key={topic} className={topicMix.some(item => item.topic === topic) ? 'is-active' : ''} title={`${topic}: ${topicIdeaCounts[topic] || 0} פריטים מקושרים`}><i className={`topic-sigil topic-sigil-${index}`} aria-hidden="true">{['◉', '⬟', '⌁', '✥', '❖', '◌'][index]}</i>{topic}</span>)}</div>
        </div>
      </section>
      <section className="topic-challenges topic-challenges-home" aria-labelledby="topic-challenges-title">
        <div className="identity-branches-heading"><div><span className="section-kicker">CHALLENGES</span><h2 id="topic-challenges-title">אתגרי נושאים</h2></div><span>באדג׳ נפרד לכל נושא</span></div>
        <div className="topic-challenge-grid">{topicChallenges.map((challenge, index) => <article className={`topic-challenge topic-challenge-${index} ${challenge.earned ? 'is-earned' : ''}`} key={challenge.topic}>
          <div className="topic-challenge-heading"><span className={`topic-challenge-mark challenge-mark-${index}`} aria-hidden="true">{TOPIC_CHALLENGE_ICONS[index]}</span><div><strong>{challenge.topic}</strong><small>{challenge.earned ? 'הבאדג׳ נחשף' : 'אתגר רעיונות בנושא'}</small></div><b>{challenge.count}/{TOPIC_CHALLENGE_GOAL}</b></div>
          <div className="mission-track" role="progressbar" aria-label={`התקדמות באתגר ${challenge.topic}`} aria-valuenow={challenge.progress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${challenge.progress}%` }} /></div>
          <div className="topic-challenge-footer"><span>{challenge.count} רעיונות מקושרים לנושא</span><strong>{challenge.earned ? 'הושלם' : `עוד ${TOPIC_CHALLENGE_GOAL - challenge.count} לחשיפה`}</strong></div>
        </article>)}</div>
      </section>
      <section className="achievement-wall" aria-labelledby="achievement-wall-title">
        <div className="achievement-wall-heading"><div><span className="section-kicker">ההישגים שלך</span><h2 id="achievement-wall-title">קיר הבאדג׳ים</h2></div><span>{earnedIdentityBadgeCount} / {IDENTITY_DIRECTIONS.length} נפתחו</span></div>
        <div className="achievement-badge-grid">{identityBadgeEntries.map(({ direction, earned, progress }) => <article key={direction.id} className={`achievement-badge ${earned ? 'is-earned' : 'is-hidden'}`}>
          <span className="achievement-badge-art" aria-hidden="true">{earned ? direction.icon : '·'}</span>
          <strong>{direction.name}</strong>
          <small>{earned ? direction.description : progress?.detail || 'נפתח אחרי גילוי הסמל'}</small>
          <span className="achievement-badge-state">{earned ? direction.id === visibleIdentityDirection.id ? 'הסמל הפעיל' : 'נפתח' : 'נעול'}</span>
        </article>)}</div>
      </section>

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

      <div className={`dashboard-panel ${collapsedDashboardSections.ideas ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('ideas') }}>
      <section className="ideas-section" id="ideas" aria-labelledby="ideas-title">
        <div className="statistics-heading"><div><span className="section-kicker">איך המחשבות שלך משתנות?</span><h2 id="ideas-title">מסע הרעיונות שלי</h2></div><span className="statistics-period">{ideas.length} רעיונות</span>{sectionControls('ideas', 'מסע הרעיונות')}</div>
        <form className="idea-create-form" onSubmit={createIdea}>
          <label><span>רעיון חדש</span><input value={ideaTitleDraft} onChange={event => setIdeaTitleDraft(event.target.value)} maxLength="100" placeholder="למשל: תחבורה ציבורית בשבת" aria-label="שם הרעיון החדש" /></label>
          <button className="primary-button" type="submit" disabled={!ideaTitleDraft.trim()}>＋ יצירת רעיון</button>
        </form>
        {ideasError && <p className="idea-error" role="alert">{ideasError}</p>}
        <div className="ideas-workspace">
          <aside className="ideas-list" aria-label="הרעיונות שלי">
            <h3>הרעיונות שלי</h3>
            {ideasLoading ? <p className="ideas-empty">טוען רעיונות…</p> : ideas.length ? ideas.map(idea => <div className={`idea-list-row ${selectedIdeaId === idea._id ? 'is-selected' : ''}`} key={idea._id}>
              <button type="button" className="idea-select-button" aria-pressed={selectedIdeaId === idea._id} onClick={() => setSelectedIdeaId(idea._id)}><strong>{idea.title}</strong><small>{idea.entries.length} פריטים בציר הזמן</small></button>
              <button type="button" className="idea-delete-button" aria-label={`מחיקת הרעיון ${idea.title}`} title="מחיקת רעיון" onClick={() => deleteIdea(idea)}>×</button>
            </div>) : <p className="ideas-empty">צרו רעיון ראשון כדי להתחיל לבנות לו ציר זמן.</p>}
          </aside>
          <div className="idea-detail">
            {selectedIdea ? <>
              <div className="idea-detail-heading"><div><span className="section-kicker">ציר הזמן</span><h3>{selectedIdea.title}</h3></div><span>{ideaTimelineEntries.length} פריטים</span></div>
              <form className="idea-link-form" onSubmit={addIdeaEntry}>
                <div className="idea-kind-switch" role="group" aria-label="סוג פריט להוספה">
                  <button type="button" className={ideaEntryKind === 'conversation' ? 'is-selected' : ''} aria-pressed={ideaEntryKind === 'conversation'} onClick={() => { setIdeaEntryKind('conversation'); setIdeaEntryTargetId(''); }}>תגובה שמורה</button>
                  <button type="button" className={ideaEntryKind === 'blogPost' ? 'is-selected' : ''} aria-pressed={ideaEntryKind === 'blogPost'} onClick={() => { setIdeaEntryKind('blogPost'); setIdeaEntryTargetId(''); }}>פוסט שלי</button>
                </div>
                <label className="idea-entry-picker"><span>{ideaEntryKind === 'conversation' ? 'בחירת תגובה שמורה' : 'בחירת פוסט מהבלוג שלי'}</span><select required value={ideaEntryTargetId} onChange={event => setIdeaEntryTargetId(event.target.value)}>
                  <option value="">בחרו פריט לציר הזמן</option>
                  {ideaEntryKind === 'conversation' ? convos.map(conversation => <option key={conversation._id} value={conversation._id}>{[conversation.siteName, conversation.pageTitle || conversation.yourComment].filter(Boolean).join(' · ').slice(0, 140)}</option>) : myBlogPosts.map(post => <option key={post._id} value={post._id}>{post.title}</option>)}
                </select></label>
                <label className="idea-entry-note"><span>הערה אישית על הפריט <small>פרטית לך בלבד</small></span><textarea value={ideaEntryNote} onChange={event => setIdeaEntryNote(event.target.value)} maxLength="500" rows="2" placeholder="מה חשבת על הרעיון בשלב הזה? (לא חובה)" /></label>
                <button className="idea-add-button" type="submit" disabled={!ideaEntryTargetId}>הוספה לציר הזמן</button>
              </form>
              {ideaTimelineEntries.length ? <ol className="idea-timeline">{ideaTimelineEntries.map(entry => {
                const noteKey = `${selectedIdea._id}:${entry._id}`;
                const missingSource = !entry.source;
                const entryTitle = entry.kind === 'conversation'
                  ? entry.source ? [entry.source.siteName, entry.source.pageTitle].filter(Boolean).join(' · ') || 'תגובה שמורה' : 'התגובה השמורה כבר לא זמינה'
                  : entry.source?.title || 'הפוסט כבר לא זמין';
                const entryBody = entry.kind === 'conversation' ? entry.source?.yourComment : entry.source?.content;
                return <li className="idea-timeline-item" key={entry._id}>
                  <span className="idea-timeline-marker" aria-hidden="true">{entry.kind === 'conversation' ? '↩' : '✎'}</span>
                  <article>
                    <div className="idea-entry-topline"><div><time dateTime={entry.sortDate.toISOString()}>{entry.sortDate.toLocaleDateString('he-IL')}</time><span>{entry.kind === 'conversation' ? 'תגובה שמורה' : 'פוסט שלי'}</span></div><button type="button" className="idea-entry-remove" onClick={() => removeIdeaEntry(selectedIdea, entry)} aria-label="הסרת הפריט מציר הזמן" title="הסרה מציר הזמן">×</button></div>
                    <h4>{entryTitle}</h4>
                    {entryBody && <p className="idea-entry-quote">{entryBody}</p>}
                    {!missingSource && <label className="idea-personal-note"><span>הערה אישית <small>נשמרת בפרטיות</small></span><textarea maxLength="500" rows="2" value={ideaNoteDrafts[noteKey] ?? entry.note ?? ''} onChange={event => setIdeaNoteDrafts(previous => ({ ...previous, [noteKey]: event.target.value }))} onBlur={event => saveIdeaNote(selectedIdea, entry, event.target.value)} placeholder="הוסיפו מחשבה משלכם על הפריט הזה" /></label>}
                  </article>
                </li>;
              })}</ol> : <p className="idea-timeline-empty">בחרו תגובה שמורה או פוסט שלכם כדי להוסיף את התחנה הראשונה למסע.</p>}
            </> : <div className="idea-detail-empty"><span aria-hidden="true">◇</span><h3>{ideasLoading ? 'טוען את הרעיונות שלך' : 'בחרו רעיון או צרו אחד חדש'}</h3><p>כל רעיון יקבל ציר זמן פרטי של תגובות ופוסטים וההערות האישיות שלכם.</p></div>}
          </div>
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
        <div className="site-comparison" aria-labelledby="site-comparison-title">
          <div className="site-comparison-heading"><h3 id="site-comparison-title">השוואת פעילות לפי אתר</h3><span>השבוע עד עכשיו מול אותה התקופה בשבוע שעבר</span></div>
          {siteComparisonRows.length ? <ul>{siteComparisonRows.map(site => <li key={site.name}>
            <strong className="site-comparison-name">{site.name}</strong>
            <span>השבוע <b>{site.current}</b></span>
            <span>בשבוע שעבר <b>{site.previous}</b></span>
          </li>)}</ul> : <p>אין עדיין נתוני פעילות לפי אתר לתקופה הזו. שמירת תגובות עם שם אתר תציג כאן השוואה.</p>}
        </div>
        <p className="recommendations-note">ההמלצות מבוססות על תגובות ששמרת ועל האתרים שהיו פעילים בהם.</p>
      </section>
      </div>

      <div className={`dashboard-panel ${collapsedDashboardSections.progress ? 'is-collapsed' : ''}`} style={{ order: dashboardOrder.indexOf('progress') }}>
      <section className="progress-section" id="progress" aria-labelledby="progress-title">
        <div className="statistics-heading"><div><span className="section-kicker">הישגים משניים</span><h2 id="progress-title">ענפי זהות ואתגרי נושאים</h2></div>{sectionControls('progress', 'ענפי זהות ואתגרי נושאים')}</div>
        <div className={`identity-branches ${crestEarned ? 'is-crest-unlocked' : 'is-crest-locked'}`} aria-labelledby="identity-branches-title">
          <div className="identity-branches-heading"><div><span className="section-kicker">{crestEarned ? 'השלב הבא בזהות' : 'מסלולי זהות נעולים'}</span><h3 id="identity-branches-title">התקדמות בעשרת ענפי הסמל האישי</h3><p className="identity-mode-caption">{crestEarned ? currentUser?.identityMode === 'custom' ? 'מצב ידני · הענף הנבחר נשאר עד שתשנה אותו' : 'מצב אוטומטי · הסמל עובר לענף חדש כשאתה פותח אותו' : 'פתחו את הסמל הבסיסי ב־20 נקודות פעילות כדי להתחיל לפתוח את תשעת הענפים.'}</p></div><span>{earnedIdentityDirections.filter(direction => direction.id !== 'crest-of-the-voice').length} מתוך 9 ענפים נפתחו</span></div>
          {crestEarned && <div className="identity-mode-switch" role="group" aria-label="בחירת אופן התפתחות הסמל">
            <button type="button" className={currentUser?.identityMode !== 'custom' ? 'is-selected' : ''} aria-pressed={currentUser?.identityMode !== 'custom'} disabled={identitySaving} onClick={() => changeIdentityMode('auto')}>התפתחות אוטומטית</button>
            <button type="button" className={currentUser?.identityMode === 'custom' ? 'is-selected' : ''} aria-pressed={currentUser?.identityMode === 'custom'} disabled={identitySaving} onClick={() => changeIdentityMode('custom')}>בחירה ונעיצה</button>
          </div>}
          <div className="identity-direction-grid">{IDENTITY_DIRECTIONS.map((direction, index) => {
            const isBaseCrest = direction.id === 'crest-of-the-voice';
            const earned = isBaseCrest
              ? crestEarned
              : earnedIdentityDirectionIds.includes(direction.id) || storedIdentityDirectionIds.includes(direction.id);
            const selected = earned && visibleIdentityDirection.id === direction.id;
            const branchProgress = isBaseCrest
              ? { value: Math.min(identityProgressPoints, CREST_UNLOCK_POINTS), goal: CREST_UNLOCK_POINTS, detail: `${Math.min(identityProgressPoints, CREST_UNLOCK_POINTS)} מתוך ${CREST_UNLOCK_POINTS} נקודות לחשיפת הסמל` }
              : direction.progress(identityStats);
            const progressPercent = branchProgress.goal === 100
              ? Math.round(branchProgress.value)
              : Math.round((branchProgress.value / branchProgress.goal) * 100);
            return <button type="button" key={direction.id} className={`identity-direction ${earned ? 'is-earned' : 'is-locked'} ${selected ? 'is-selected' : ''}`} aria-pressed={selected} disabled={!earned || identitySaving} onClick={() => changeIdentityDirection(direction.id)}>
              <span className={`identity-direction-mark identity-mark-${index}`} aria-hidden="true">{earned ? direction.icon : '·'}</span><strong>{direction.name}</strong><small>{direction.description}</small>
              {!earned && <><span className="identity-branch-progress-copy">{branchProgress.detail}</span><span className="identity-branch-track" role="progressbar" aria-label={`התקדמות לפתיחת ${direction.name}`} aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${progressPercent}%` }} /></span></>}
              <span className="identity-direction-state">{!earned ? isBaseCrest ? `${progressPercent}% לחשיפת הסמל` : 'ייפתח אחרי גילוי הסמל' : selected ? currentUser?.identityMode === 'custom' ? 'הענף הנעוץ שלך' : 'הענף הפעיל · אוטומטי' : 'נפתח · לחצו לנעיצה'}</span>
            </button>;
          })}</div>
        </div>
        <section className={`activity-level-panel level-${currentActivityLevel.className}`} aria-labelledby="activity-level-title">
          <div className="activity-level-heading">
            <span className="activity-level-emblem" aria-hidden="true">{currentActivityLevel.icon}</span>
            <div><span className="section-kicker">רמת הפעילות הכללית</span><h3 id="activity-level-title">{currentActivityLevel.name}</h3></div>
            <strong className="activity-level-points">{totalPoints}<small> נק׳</small></strong>
          </div>
          {nextActivityLevel ? <>
            <p className="activity-level-next">עוד <strong>{nextActivityLevel.min - totalPoints}</strong> נקודות לדרגת <strong>{nextActivityLevel.name}</strong></p>
            <div className="progress-track activity-level-track" role="progressbar" aria-label={`התקדמות מדרגת ${currentActivityLevel.name} לדרגת ${nextActivityLevel.name}`} aria-valuenow={activityLevelProgress} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${activityLevelProgress}%` }} /></div>
            <div className="activity-level-caption"><span>{activityLevelProgress}% לרמה הבאה</span><span>{totalPoints} / {nextActivityLevel.min} נקודות</span></div>
          </> : <p className="activity-level-next is-max-level">הגעת לדרגת הפעילות הגבוהה ביותר.</p>}
        </section>
        <div className="progress-summary"><strong>{totalPoints}</strong><span>נקודות פעילות</span></div>
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
          <h3>הפעילות שלי בבלוג</h3>
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
        <div className="blog-filter-row" aria-label="סינון פוסטים לפי כותב, אתר, נושא ותאריך">
          <label className="blog-filter-field blog-author-filter"><span>כותב</span><select value={myBlogAuthorFilter} onChange={event => setMyBlogAuthorFilter(event.target.value)}><option value="all">כל הכינויים שלי</option>{myBlogAuthors.map(author => <option key={author} value={author}>{author}</option>)}</select></label>
          <label className="blog-filter-field"><span>אתר מקור</span><select value={myBlogSiteFilter} onChange={event => setMyBlogSiteFilter(event.target.value)}><option value="all">כל האתרים</option>{myBlogSites.map(site => <option key={site.key} value={site.key}>{site.label}</option>)}<option value="uncategorized">ללא אתר מקור</option></select></label>
          <label className="blog-filter-field"><span>נושא האתר</span><select value={myBlogTopicFilter} onChange={event => setMyBlogTopicFilter(event.target.value)}><option value="all">כל הנושאים</option>{TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}<option value="uncategorized">ללא נושא</option></select></label>
          <label className="blog-filter-field"><span>מתאריך</span><input type="date" value={myBlogDateRange.from} max={myBlogDateRange.to || undefined} onChange={event => setMyBlogDateRange(previous => ({ ...previous, from: event.target.value }))} /></label>
          <label className="blog-filter-field"><span>עד תאריך</span><input type="date" value={myBlogDateRange.to} min={myBlogDateRange.from || undefined} onChange={event => setMyBlogDateRange(previous => ({ ...previous, to: event.target.value }))} /></label>
          {(myBlogAuthorFilter !== 'all' || myBlogSiteFilter !== 'all' || myBlogTopicFilter !== 'all' || myBlogDateRange.from || myBlogDateRange.to) && <button className="blog-filter-reset" type="button" onClick={() => { setMyBlogAuthorFilter('all'); setMyBlogSiteFilter('all'); setMyBlogTopicFilter('all'); setMyBlogDateRange({ from: '', to: '' }); }}>ניקוי סינון</button>}
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
        <div className="blog-filter-row" aria-label="סינון פוסטים לפי כותב, אתר, נושא ותאריך">
          <label className="blog-filter-field blog-author-filter"><span>כותב</span><select value={communityBlogAuthorFilter} onChange={event => setCommunityBlogAuthorFilter(event.target.value)}><option value="all">כל הכותבים</option>{blogAuthors.map(author => <option key={author} value={author}>{author}</option>)}</select></label>
          <label className="blog-filter-field"><span>אתר מקור</span><select value={communityBlogSiteFilter} onChange={event => setCommunityBlogSiteFilter(event.target.value)}><option value="all">כל האתרים</option>{communityBlogSites.map(site => <option key={site.key} value={site.key}>{site.label}</option>)}<option value="uncategorized">ללא אתר מקור</option></select></label>
          <label className="blog-filter-field"><span>נושא האתר</span><select value={communityBlogTopicFilter} onChange={event => setCommunityBlogTopicFilter(event.target.value)}><option value="all">כל הנושאים</option>{TOPICS.map(topic => <option key={topic} value={topic}>{topic}</option>)}<option value="uncategorized">ללא נושא</option></select></label>
          <label className="blog-filter-field"><span>מתאריך</span><input type="date" value={communityBlogDateRange.from} max={communityBlogDateRange.to || undefined} onChange={event => setCommunityBlogDateRange(previous => ({ ...previous, from: event.target.value }))} /></label>
          <label className="blog-filter-field"><span>עד תאריך</span><input type="date" value={communityBlogDateRange.to} min={communityBlogDateRange.from || undefined} onChange={event => setCommunityBlogDateRange(previous => ({ ...previous, to: event.target.value }))} /></label>
          {(communityBlogAuthorFilter !== 'all' || communityBlogSiteFilter !== 'all' || communityBlogTopicFilter !== 'all' || communityBlogDateRange.from || communityBlogDateRange.to) && <button className="blog-filter-reset" type="button" onClick={() => { setCommunityBlogAuthorFilter('all'); setCommunityBlogSiteFilter('all'); setCommunityBlogTopicFilter('all'); setCommunityBlogDateRange({ from: '', to: '' }); }}>ניקוי סינון</button>}
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
                const identityDirection = getIdentityDirection(user.featuredIdentityDirectionId);
                const pinnedBadgeIndex = TOPIC_CHALLENGE_BADGE_IDS.indexOf(user.featuredChallengeBadgeId);
                const pinnedBadgeTopic = pinnedBadgeIndex >= 0 ? TOPICS[pinnedBadgeIndex] : null;
                return <tr key={user.id} className={user.id === currentUser.id ? 'is-current-user' : ''}>
                  <td className="leaderboard-position" data-label="מקום"><span>{user.position <= 3 ? ['🥇', '🥈', '🥉'][user.position - 1] : user.position}</span></td>
                  <td className="leaderboard-user-cell" data-label="מגיב/ה"><button className="leaderboard-user-link" type="button" onClick={() => openPublicProfile(user.id)}><span className="leaderboard-avatar" aria-hidden="true">{avatar.emoji}</span><strong>{user.displayName || 'מגיב/ה'}</strong>{identityDirection && <span className="identity-featured-badge" title={`סמל הזהות של ${user.displayName}: ${identityDirection.name}`}><i aria-hidden="true">{identityDirection.icon}</i>{identityDirection.name}</span>}{pinnedBadgeTopic && <span className={`leaderboard-featured-badge topic-challenge-${pinnedBadgeIndex}`} title={`הבאדג׳ הנעוץ של ${user.displayName}: ${pinnedBadgeTopic}`}><i aria-hidden="true">{TOPIC_CHALLENGE_ICONS[pinnedBadgeIndex]}</i>{pinnedBadgeTopic}</span>}{user.id === currentUser.id && <small>זה/זו אני</small>}</button></td>
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
            <label className="settings-field featured-badge-select">הבאדג׳ שיופיע לצד הכינוי
              <select value={featuredChallengeBadge?.badgeId || ''} disabled={featuredBadgeSaving || !earnedTopicChallenges.length} onChange={event => changeFeaturedBadge(event.target.value)}>
                <option value="">{earnedTopicChallenges.length ? 'בחירה אוטומטית · האחרון שהרווחת' : 'באדג׳ים יופיעו אחרי זכייה באתגר'}</option>
                {earnedTopicChallenges.map(challenge => <option key={challenge.badgeId} value={challenge.badgeId}>{challenge.topic}</option>)}
              </select>
              <small>{featuredBadgeSaving ? 'שומר בחירה…' : earnedTopicChallenges.length ? 'יוצג הבאדג׳ האחרון שהרווחת, או באדג׳ שתבחר/י.' : 'השלם אתגר נושא כדי להציג באדג׳ לצד הכינוי.'}</small>
            </label>
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
          <div className="conversation-form-actions">
            <button className="primary-button" onClick={submit}>{editingConversationId ? 'שמור עדכון' : 'שמור תגובה'} <span>←</span></button>
            {editingConversationId && <button className="conversation-edit-cancel" type="button" onClick={cancelConversationEdit}>ביטול עריכה</button>}
          </div>
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
            {savedSites.map(site => <option key={site.key} value={site.key}>{site.label}</option>)}
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
                  <button className="card-update-button idea-link-trigger" type="button" aria-expanded={ideaLinkConversationId === conversation._id} onClick={() => ideaLinkConversationId === conversation._id ? setIdeaLinkConversationId('') : startIdeaLink(conversation)}>שייך לרעיון</button>
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
              {ideaLinkConversationId === conversation._id && <form className="comment-idea-link-form" onSubmit={event => ideas.length ? linkConversationToIdea(event, conversation) : createIdeaAndLinkConversation(event, conversation)}>
                {ideas.length ? <label><span>בחירת רעיון</span><select required value={ideaLinkSelectedIdeaId} onChange={event => setIdeaLinkSelectedIdeaId(event.target.value)}><option value="">בחרו רעיון</option>{ideas.map(idea => <option key={idea._id} value={idea._id}>{idea.title}</option>)}</select></label>
                  : <label><span>שם הרעיון הראשון</span><input required maxLength="100" value={ideaLinkNewTitle} onChange={event => setIdeaLinkNewTitle(event.target.value)} placeholder="למשל: תחבורה ציבורית בשבת" /> </label>}
                <label className="comment-idea-note"><span>הערה אישית <small>פרטית לך בלבד</small></span><textarea maxLength="500" rows="2" value={ideaLinkNote} onChange={event => setIdeaLinkNote(event.target.value)} placeholder="מה חשבת על הרעיון כשכתבת את התגובה? (לא חובה)" /></label>
                <div className="comment-idea-form-actions"><button className="idea-add-button" type="submit" disabled={ideas.length ? !ideaLinkSelectedIdeaId : !ideaLinkNewTitle.trim()}>{ideas.length ? 'הוסף למסע הרעיון' : 'צור רעיון והוסף תגובה'}</button><button className="comment-idea-cancel" type="button" onClick={() => setIdeaLinkConversationId('')}>ביטול</button></div>
              </form>}
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
            <div className="public-profile-title-group"><span className="section-kicker">פרופיל ציבורי</span><div className="public-profile-name-row"><h2 id="public-profile-title">{publicProfileLoading ? 'טוען פרופיל…' : publicProfile?.displayName || 'פרופיל משתמש'}</h2>{getIdentityDirection(publicProfile?.featuredIdentityDirectionId) && <span className="identity-featured-badge" title={`סמל הזהות: ${getIdentityDirection(publicProfile.featuredIdentityDirectionId).name}`}><i aria-hidden="true">{getIdentityDirection(publicProfile.featuredIdentityDirectionId).icon}</i>{getIdentityDirection(publicProfile.featuredIdentityDirectionId).name}</span>}{getTopicChallengeBadge(publicProfile?.featuredChallengeBadgeId) && <span className={`user-badge identity-user-badge featured-topic-badge topic-challenge-${getTopicChallengeBadge(publicProfile.featuredChallengeBadgeId).index}`} title={`באדג׳ האתגר הנעוץ: ${getTopicChallengeBadge(publicProfile.featuredChallengeBadgeId).topic}`}><span className={`identity-user-mark challenge-mark-${getTopicChallengeBadge(publicProfile.featuredChallengeBadgeId).index}`} aria-hidden="true">{getTopicChallengeBadge(publicProfile.featuredChallengeBadgeId).icon}</span><span className="badge-copy"><strong>{getTopicChallengeBadge(publicProfile.featuredChallengeBadgeId).topic}</strong><small>באדג׳ אתגר</small></span></span>}</div>{publicProfile && <><small>{publicProfile.posts.length} פוסטים שפורסמו</small><div className="public-profile-meta">
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
