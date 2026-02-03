const React = require('react');

// Simple mock for react-router-dom used by tests. Exports minimal pieces used across the app.
module.exports = {
  MemoryRouter: ({ children }) => children,
  Routes: ({ children }) => React.createElement(React.Fragment, null, children),
  Route: ({ element }) => element,
  Link: ({ children, to }) => React.createElement('a', { href: to || '#' }, children),
  useNavigate: () => () => {},
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({})
};