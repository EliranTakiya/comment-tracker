import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

vi.mock('axios', () => ({
  default: {
    defaults: {},
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

test('renders the sign-in screen after checking the current session', async () => {
  sessionStorage.setItem('comment-tracker-splash-seen', 'true');
  axios.get.mockImplementation(url => {
    if (url.endsWith('/api/auth/status')) return Promise.resolve({ data: { needsInitialOwner: false, setupCodeConfigured: false } });
    return Promise.reject({ response: { status: 401 } });
  });

  render(<App />);
  await waitFor(() => expect(screen.getByRole('heading', { name: 'התחברות לחשבון' })).toBeInTheDocument());
  expect(screen.getByLabelText('אימייל')).toBeInTheDocument();
  expect(screen.getByLabelText('סיסמה')).toBeInTheDocument();
});

test('retains badge, ideas, and cross-screen blog workflows', async () => {
  sessionStorage.setItem('comment-tracker-splash-seen', 'true');
  localStorage.removeItem('comment-tracker-collapsed-sections');
  localStorage.removeItem('comment-tracker-section-order');
  window.history.replaceState(null, '', '/');
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });

  const user = {
    id: 'user-1',
    email: 'member@example.test',
    displayName: 'מגיב לדוגמה',
    theme: 'day',
    avatarId: 'comment-bubble',
    identityMode: 'auto',
    selectedIdentityDirection: 'crest-of-the-voice',
    unlockedIdentityDirections: ['the-axis'],
    earnedChallengeBadges: [],
  };
  const conversation = {
    _id: 'conversation-1',
    siteName: 'אתר לדוגמה',
    siteUrl: 'https://example.test/article',
    pageTitle: 'דיון לדוגמה',
    commentId: 'comment-1',
    yourComment: 'תגובה לדוגמה להעברה לבלוג',
    createdAt: '2025-01-01T12:00:00.000Z',
    hint: 'חדשות כללי',
    likesCount: 0,
    dislikesCount: 0,
    repliesCount: 0,
  };
  const blogPost = {
    _id: 'post-1',
    ownerId: user.id,
    author: user.displayName,
    title: 'פוסט קהילתי לדוגמה',
    content: 'תוכן לדוגמה',
    createdAt: '2025-01-01T12:00:00.000Z',
    comments: [],
    likesCount: 0,
    dislikesCount: 0,
    sourceConversationIds: [],
    sourceLikesCount: 0,
    sourceDislikesCount: 0,
  };

  axios.get.mockImplementation(url => {
    if (url.endsWith('/api/auth/status')) return Promise.resolve({ data: { needsInitialOwner: false, setupCodeConfigured: false } });
    if (url.endsWith('/api/auth/me')) return Promise.resolve({ data: { user } });
    if (url.endsWith('/api/conversations')) return Promise.resolve({ data: [conversation] });
    if (url.endsWith('/api/ideas')) return Promise.resolve({ data: [{ _id: 'idea-1', title: 'הרעיון שלי', entries: [] }] });
    if (url.endsWith('/api/task-rewards')) return Promise.resolve({ data: { totalPoints: 30, claims: [] } });
    if (url.endsWith('/api/blog-posts/leaderboard')) return Promise.resolve({ data: [] });
    if (url.endsWith('/api/blog-posts')) return Promise.resolve({ data: [blogPost] });
    return Promise.resolve({ data: [] });
  });

  const { container } = render(<App />);
  await screen.findByRole('heading', { name: 'התגובות שלך, במקום אחד' });
  expect(container.querySelectorAll('.home-screen > .app-footer')).toHaveLength(1);
  const panelsWithFooters = [...container.querySelectorAll('.dashboard-panel > .app-footer')].map(footer => footer.parentElement.id || footer.parentElement.querySelector('[id]')?.id || 'unnamed');
  expect(panelsWithFooters).toEqual(['statistics', 'tasks', 'ideas', 'recommendations', 'progress', 'blog', 'community-blog', 'leaderboard', 'settings', 'comments']);
  await waitFor(() => expect(container.querySelectorAll('.achievement-wall .achievement-badge')).toHaveLength(2));
  expect(container.querySelector('.achievement-wall')).not.toHaveTextContent('החותם');
  expect(container.querySelector('.achievement-wall-heading')).toHaveTextContent('2 / 10 נפתחו');
  expect(screen.getAllByRole('button', { name: 'התראות, יוגדרו בהמשך' })).toHaveLength(2);
  expect(screen.getAllByRole('button', { name: 'התראות, יוגדרו בהמשך' }).every(button => button.disabled)).toBe(true);
  expect([...container.querySelectorAll('.mobile-more-menu button')].map(button => button.textContent.trim())).toEqual([
    '✓המשימות שלי',
    '✦המלצות אישיות',
    '↗ההתקדמות שלי',
    '✎הבלוג שלי',
    '◎בלוג המגיבים',
    '≡טבלת מגיבים',
    '⚙הגדרות',
  ]);

  fireEvent.click(container.querySelector('.nav-progress'));
  await waitFor(() => expect(window.location.hash).toBe('#progress'));
  expect(container.querySelectorAll('.dashboard-panel.is-active .identity-direction-grid .identity-direction')).toHaveLength(10);
  expect(container.querySelector('.dashboard-panel.is-active .identity-branches-heading')).toHaveTextContent('2/10 ענפים נפתחו');
  expect(container.querySelector('.dashboard-panel.is-active > .app-footer')).toHaveTextContent('© All rights reserved to Eliran Takiya');

  fireEvent.click(container.querySelector('.nav-ideas'));
  await waitFor(() => expect(window.location.hash).toBe('#ideas'));
  expect(container.querySelector('.dashboard-panel.is-active .ideas-list')).toHaveTextContent('הרעיון שלי');

  fireEvent.click(container.querySelector('.nav-community'));
  await waitFor(() => expect(window.location.hash).toBe('#community-blog'));
  fireEvent.click(container.querySelector('.dashboard-panel.is-active .edit-blog-button'));
  await waitFor(() => expect(window.location.hash).toBe('#blog'));
  expect(container.querySelector('.dashboard-panel.is-active #blog .blog-compose')).toHaveClass('is-open');

  fireEvent.click(container.querySelector('.nav-comments'));
  await waitFor(() => expect(window.location.hash).toBe('#comments'));
  const addToBlogButton = [...container.querySelectorAll('.dashboard-panel.is-active button')]
    .find(button => button.textContent.includes('הוסף לבלוג'));
  fireEvent.click(addToBlogButton);
  await waitFor(() => expect(window.location.hash).toBe('#blog'));
  expect(container.querySelector('.dashboard-panel.is-active #blog .blog-compose')).toHaveClass('is-open');
  expect(container.querySelector('#blog .blog-compose textarea')).toHaveValue(`${blogPost.content}\n\n${conversation.yourComment}`);
});
