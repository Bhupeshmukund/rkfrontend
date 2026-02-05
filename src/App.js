import './App.css';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Header from './components/header/Header';
import Footer from './components/footer/Footer';
import WhatsAppFloat from './components/WhatsAppFloat/WhatsAppFloat';
import EmailFloat from './components/EmailFloat/EmailFloat';
import ScrollToTop from './components/ScrollToTop/ScrollToTop';

import Homepage from './pages/homepage/Homepage';
import CategoryProducts from './pages/products/Product';
import ProductPage from './pages/detail-product/ProductPage';
import AdminPanel from './pages/admin/AdminPanel';
import Contact from './pages/Contact/Contact';
import About from './pages/About/About';
import BankDetails from './pages/BankDetails/BankDetails';
import ShoppingCart from './pages/Cart/ShoppingCart';
import Checkout from './pages/Checkout/Checkout';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import Profile from './pages/Profile/Profile';
import Orders from './pages/Orders/Orders';
import RestaurantOrders from './pages/RestaurantOrders/RestaurantOrders';
function App() {
  return (
    <>
      <ScrollToTop />
      <Header />

      <main>
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
          <Route path="/profile" element={<Profile />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/restaurant-orders" element={<RestaurantOrders />} />
        </Routes>

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
    </>
  );
}

export default App;
