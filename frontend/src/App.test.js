import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the comment tracker interface', () => {
  render(<App />);
  expect(screen.getByText('התגובות שלך, במקום אחד')).toBeInTheDocument();
  expect(screen.getByLabelText('סינון לפי נושא')).toBeInTheDocument();
  expect(screen.getByLabelText('סינון לפי תאריך')).toBeInTheDocument();
});
