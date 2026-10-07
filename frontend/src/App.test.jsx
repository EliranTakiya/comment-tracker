import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

vi.mock('axios', () => ({
  default: {
    defaults: {},
    get: vi.fn(),
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
