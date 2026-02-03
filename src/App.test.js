import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock react-router-dom for the test environment to avoid resolver issues
jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    MemoryRouter: ({ children }) => children,
    Routes: ({ children }) => <>{children}</>,
    Route: ({ element }) => element,
    Link: ({ children }) => <a>{children}</a>,
    useNavigate: () => () => {},
    useLocation: () => ({ pathname: '/' }),
    useParams: () => ({})
  };
});

import App from './App';

test('renders header logo', () => {
  render(<App />);
  const logos = screen.getAllByAltText(/RK Industries/i);
  expect(logos.length).toBeGreaterThan(0);
});
