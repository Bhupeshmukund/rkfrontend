import './App.css';
import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { CurrencyProvider } from './contexts/CurrencyContext';

import Header from './components/header/Header';
import Footer from './components/footer/Footer';
import WhatsAppFloat from './components/WhatsAppFloat/WhatsAppFloat';
import EmailFloat from './components/EmailFloat/EmailFloat';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

// Critical routes - loaded immediately (homepage, product pages)
import Homepage from './pages/homepage/Homepage';
import CategoryProducts from './pages/products/Product';
import ProductPage from './pages/detail-product/ProductPage';

// Lazy load non-critical routes for code splitting
const AdminPanel = lazy(() => import('./pages/admin/AdminPanel'));
const Contact = lazy(() => import('./pages/Contact/Contact'));
const About = lazy(() => import('./pages/About/About'));
const BankDetails = lazy(() => import('./pages/BankDetails/BankDetails'));
const ShoppingCart = lazy(() => import('./pages/Cart/ShoppingCart'));
const Checkout = lazy(() => import('./pages/Checkout/Checkout'));
const Login = lazy(() => import('./components/Auth/Login'));
const Signup = lazy(() => import('./components/Auth/Signup'));
const VerifyEmail = lazy(() => import('./components/Auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./components/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./components/Auth/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile/Profile'));
const Orders = lazy(() => import('./pages/Orders/Orders'));
const RestaurantOrders = lazy(() => import('./pages/RestaurantOrders/RestaurantOrders'));
const Dealership = lazy(() => import('./pages/Dealership/Dealership'));

// Loading fallback component
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '50vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Loading...
  </div>
);
function App() {
  return (
    <CurrencyProvider>
      <ScrollToTop />
      <Header />

      <main>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/category/:slug" element={<CategoryProducts />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/bank-details" element={<BankDetails />} />
            <Route path="/cart" element={<ShoppingCart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/restaurant-orders" element={<RestaurantOrders />} />
            <Route path="/dealership" element={<Dealership />} />
          </Routes>
        </Suspense>
      </main>

      <Footer />
      <WhatsAppFloat />
      <EmailFloat />
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </CurrencyProvider>
  );
}

export default App;
