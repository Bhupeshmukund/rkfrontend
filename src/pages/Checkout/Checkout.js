import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";
import { getCart, getCartTotal, clearCart } from "../../utils/cart";
import { api } from "../../api";
import { Country, State, City } from "country-state-city";
import { useCurrency } from "../../contexts/CurrencyContext";
import { formatPrice } from "../../utils/currency";

const Checkout = () => {
  const navigate = useNavigate();
  const { currency, exchangeRate } = useCurrency();
  const [cart, setCart] = useState([]);
  const [paymentProof, setPaymentProof] = useState(null);
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState("");
  const [selectedStateCode, setSelectedStateCode] = useState("");
  const [errors, setErrors] = useState({});
  const [billing, setBilling] = useState({
    firstName: "",
    lastName: "",
    company: "",
    country: "",
    countryCode: "",
    state: "",
    stateCode: "",
    city: "",
    address1: "",
    address2: "",
    zip: "",
    phone: "",
    email: "",
    gst: "",
    iec: "",
    notes: "",
    payment: "razorpay",
  });

  // Load states when country changes
  const loadStatesForCountry = (countryCode) => {
    if (!countryCode) {
      setStates([]);
      setCities([]);
      setSelectedStateCode("");
      return;
    }
    const countryStates = State.getStatesOfCountry(countryCode);
    setStates(countryStates);
    setCities([]);
    setSelectedStateCode("");
    setBilling(prev => ({ ...prev, state: "", stateCode: "", city: "" }));
  };

  // Load cities when state changes
  const loadCitiesForState = (countryCode, stateCode) => {
    if (!countryCode || !stateCode) {
      setCities([]);
      return;
    }
    const stateCities = City.getCitiesOfState(countryCode, stateCode);
    setCities(stateCities);
    setBilling(prev => ({ ...prev, city: "" }));
  };

  // Exchange rate conversion removed - all prices are in USDT

  // Load countries and set default to India
  useEffect(() => {
    const allCountries = Country.getAllCountries();
    setCountries(allCountries);
    
    // Set default to India if available
    const india = allCountries.find(c => c.name === "India");
    if (india) {
      setBilling(prev => ({ ...prev, country: "India", countryCode: india.isoCode }));
      setSelectedCountryCode(india.isoCode);
      loadStatesForCountry(india.isoCode);
    }
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    // Load cart from localStorage
    const loadCart = () => {
      const cartData = getCart();
      setCart(cartData);
      
      // Redirect to cart if empty
      if (cartData.length === 0) {
        navigate("/cart");
      }
    };

    loadCart();

    // Listen for cart updates
    const handleCartUpdate = () => {
      loadCart();
    };

    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [navigate]);

  const handleCountryChange = (e) => {
    const countryName = e.target.value;
    const country = countries.find(c => c.name === countryName);
    
    if (country) {
      setSelectedCountryCode(country.isoCode);
      loadStatesForCountry(country.isoCode);
      
      // Clear IEC code when country changes to India, clear GST when not India
      setBilling(prev => ({ 
        ...prev, 
        country: countryName, 
        countryCode: country.isoCode,
        state: "",
        stateCode: "",
        city: "",
        iec: countryName === "India" ? "" : prev.iec,
        gst: countryName === "India" ? prev.gst : ""
      }));
      // Clear country-related errors and validate country
      const newErrors = { ...errors };
      delete newErrors.state;
      delete newErrors.city;
      delete newErrors.iec;
      setErrors(newErrors);
      validateField("country", countryName);
    } else {
      // If no country selected
      setSelectedCountryCode("");
      loadStatesForCountry("");
      setBilling(prev => ({ 
        ...prev, 
        country: "", 
        countryCode: "",
        state: "",
        stateCode: "",
        city: ""
      }));
    }
  };

  const handleStateChange = (e) => {
    const stateName = e.target.value;
    const state = states.find(s => s.name === stateName);
    
    if (state) {
      setSelectedStateCode(state.isoCode);
      loadCitiesForState(selectedCountryCode, state.isoCode);
      setBilling(prev => ({ 
        ...prev, 
        state: stateName, 
        stateCode: state.isoCode,
        city: "" 
      }));
      validateField("state", stateName);
    }
  };

  const handleCityChange = (e) => {
    const cityValue = e.target.value;
    setBilling({ ...billing, city: cityValue });
    validateField("city", cityValue);
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone) => {
    // Only numbers allowed, any length
    return /^\d+$/.test(phone);
  };

  const validateField = (name, value) => {
    const newErrors = { ...errors };

    switch (name) {
      case "firstName":
        if (!value.trim()) {
          newErrors.firstName = "First name is required";
        } else {
          delete newErrors.firstName;
        }
        break;
      case "lastName":
        if (!value.trim()) {
          newErrors.lastName = "Last name is required";
        } else {
          delete newErrors.lastName;
        }
        break;
      case "country":
        if (!value) {
          newErrors.country = "Country is required";
        } else {
          delete newErrors.country;
        }
        break;
      case "state":
        if (!value.trim()) {
          newErrors.state = "State/Province is required";
        } else {
          delete newErrors.state;
        }
        break;
      case "city":
        if (!value.trim()) {
          newErrors.city = "City is required";
        } else {
          delete newErrors.city;
        }
        break;
      case "address1":
        if (!value.trim()) {
          newErrors.address1 = "Street address is required";
        } else {
          delete newErrors.address1;
        }
        break;
      case "zip":
        if (!value.trim()) {
          newErrors.zip = "Postcode/ZIP is required";
        } else {
          delete newErrors.zip;
        }
        break;
      case "phone":
        if (!value.trim()) {
          newErrors.phone = "Phone number is required";
        } else if (!validatePhone(value)) {
          newErrors.phone = "Phone number must contain only digits";
        } else {
          delete newErrors.phone;
        }
        break;
      case "email":
        if (!value.trim()) {
          newErrors.email = "Email is required";
        } else if (!validateEmail(value)) {
          newErrors.email = "Please enter a valid email address";
        } else {
          delete newErrors.email;
        }
        break;
      case "iec":
        if (billing.country && billing.country !== "India" && !value.trim()) {
          newErrors.iec = "IEC code is required for international orders";
        } else {
          delete newErrors.iec;
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBilling({ ...billing, [name]: value });
    // Validate on change
    validateField(name, value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type (optional: only images and PDFs)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a valid file (JPG, PNG, GIF, or PDF)');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      setPaymentProof(file);
    }
  };

  const validateAllFields = () => {
    const newErrors = {};
    
    // Validate all required fields
    if (!billing.firstName.trim()) newErrors.firstName = "First name is required";
    if (!billing.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!billing.country) newErrors.country = "Country is required";
    if (!billing.state.trim()) newErrors.state = "State/Province is required";
    if (!billing.city.trim()) newErrors.city = "City is required";
    if (!billing.address1.trim()) newErrors.address1 = "Street address is required";
    if (!billing.zip.trim()) newErrors.zip = "Postcode/ZIP is required";
    
    // Validate phone
    if (!billing.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(billing.phone)) {
      newErrors.phone = "Phone number must contain only digits";
    }
    
    // Validate email
    if (!billing.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(billing.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    // Validate IEC for non-India
    if (billing.country && billing.country !== "India" && !billing.iec?.trim()) {
      newErrors.iec = "IEC code is required for international orders";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      alert("Your cart is empty. Please add items to cart.");
      navigate("/cart");
      return;
    }

    // Validate all fields
    if (!validateAllFields()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.error-message')?.closest('div')?.querySelector('input, select');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
      }
      return;
    }

    // Validate payment proof for bank transfer
    if (billing.payment === "bank" && !paymentProof) {
      alert("Please upload proof of payment for bank transfer.");
      return;
    }

    // Calculate totals (GST only for India)
    const subtotalAmount = getCartTotal();
    const shippingAmount = 250;
    const gstAmount = billing.country === "India" ? subtotalAmount * 0.18 : 0;
    const totalAmount = subtotalAmount + shippingAmount + gstAmount;

    // Handle Razorpay payment
    if (billing.payment === "razorpay") {
      try {
        // Create Razorpay order
        const razorpayOrderResponse = await api.createRazorpayOrder(totalAmount);
        
        if (!razorpayOrderResponse.orderId) {
          throw new Error("Failed to create Razorpay order");
        }

        const options = {
          key: razorpayOrderResponse.keyId,
          amount: razorpayOrderResponse.amount,
          currency: razorpayOrderResponse.currency,
          name: "RK Industries",
          description: "Order Payment",
          order_id: razorpayOrderResponse.orderId,
          handler: async (response) => {
            try {
              // Verify payment and create order
              await api.verifyRazorpayPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                billing: billing,
                items: cart,
                subtotal: subtotalAmount,
                shipping: shippingAmount,
                gst: gstAmount,
                total: totalAmount
              });

              // Clear cart after order is placed
              clearCart();
              
              alert("Payment successful! Order placed successfully.");
              navigate("/orders");
            } catch (err) {
              alert(`Payment verification failed: ${err.message}`);
              console.error("Payment verification error:", err);
            }
          },
          prefill: {
            name: `${billing.firstName} ${billing.lastName}`,
            email: billing.email,
            contact: billing.phone
          },
          theme: {
            color: "#0066cc"
          },
          modal: {
            ondismiss: () => {
              console.log("Payment cancelled by user");
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (response) => {
          alert(`Payment failed: ${response.error.description || "Payment failed. Please try again."}`);
          console.error("Payment failed:", response.error);
        });
        razorpay.open();
      } catch (err) {
        alert(`Failed to initiate payment: ${err.message}`);
        console.error("Razorpay initialization error:", err);
      }
      return;
    }

    // Handle bank transfer payment
    try {
      // Create FormData for file upload
      const formData = new FormData();
      
      // Add payment proof file if exists
      if (paymentProof) {
        formData.append("paymentProof", paymentProof);
      }
      
      // Add other order data as JSON strings
      formData.append("billing", JSON.stringify(billing));
      formData.append("items", JSON.stringify(cart));
      formData.append("subtotal", subtotalAmount.toString());
      formData.append("shipping", shippingAmount.toString());
      formData.append("gst", gstAmount.toString());
      formData.append("total", totalAmount.toString());
      formData.append("paymentMethod", billing.payment);

      // Save order to database
      await api.createOrder(formData);
      
      // Clear cart after order is placed
      clearCart();
      
      alert("Order placed successfully!");
      navigate("/orders");
    } catch (err) {
      alert(`Failed to place order: ${err.message}`);
      console.error("Order placement error:", err);
    }
  };

  // Helper function to format currency based on user location
  const formatCurrency = (amount) => {
    return formatPrice(amount, currency, exchangeRate);
  };

  // Calculate totals (GST only for India)
  const subtotal = getCartTotal();
  const shipping = 250;
  const gst = billing.country === "India" ? subtotal * 0.18 : 0; // 18% GST only for India
  const total = subtotal + shipping + gst;

  return (
    <form className="checkout-container" onSubmit={handleSubmit}>
      {/* LEFT – Billing */}
      <div className="checkout-left">
        <h3>Billing Details</h3>

        {/* Name Fields */}
        <div className="row">
          <div className="field-wrapper">
            <input 
              name="firstName" 
              placeholder="First Name *" 
              value={billing.firstName}
              onChange={handleChange}
              onBlur={() => validateField("firstName", billing.firstName)}
              className={errors.firstName ? "error" : ""}
              required 
            />
            {errors.firstName && <span className="error-message">{errors.firstName}</span>}
          </div>
          <div className="field-wrapper">
            <input 
              name="lastName" 
              placeholder="Last Name *" 
              value={billing.lastName}
              onChange={handleChange}
              onBlur={() => validateField("lastName", billing.lastName)}
              className={errors.lastName ? "error" : ""}
              required 
            />
            {errors.lastName && <span className="error-message">{errors.lastName}</span>}
          </div>
        </div>

        {/* Company (Optional) */}
        <div className="field-wrapper">
          <input 
            name="company" 
            placeholder="Company Name (optional)" 
            value={billing.company}
            onChange={handleChange}
          />
        </div>

        {/* Country */}
        <div className="field-wrapper">
          <select 
            name="country" 
            value={billing.country} 
            onChange={handleCountryChange}
            onBlur={() => validateField("country", billing.country)}
            className={errors.country ? "error" : ""}
            required
          >
            <option value="">Select Country *</option>
            {countries.map(country => (
              <option key={country.isoCode} value={country.name}>{country.name}</option>
            ))}
          </select>
          {errors.country && <span className="error-message">{errors.country}</span>}
        </div>

        {/* State */}
        {states.length > 0 && (
          <div className="field-wrapper">
            <select 
              name="state" 
              value={billing.state}
              onChange={handleStateChange}
              onBlur={() => validateField("state", billing.state)}
              className={errors.state ? "error" : ""}
              required
            >
              <option value="">Select State / Province *</option>
              {states.map(state => (
                <option key={state.isoCode} value={state.name}>{state.name}</option>
              ))}
            </select>
            {errors.state && <span className="error-message">{errors.state}</span>}
          </div>
        )}

        {states.length === 0 && billing.country && (
          <div className="field-wrapper">
            <input 
              name="state" 
              placeholder="State / Province *" 
              value={billing.state}
              onChange={handleChange}
              onBlur={() => validateField("state", billing.state)}
              className={errors.state ? "error" : ""}
              required 
            />
            {errors.state && <span className="error-message">{errors.state}</span>}
          </div>
        )}

        {/* City */}
        {cities.length > 0 && (
          <div className="field-wrapper">
            <select 
              name="city" 
              value={billing.city}
              onChange={handleCityChange}
              onBlur={() => validateField("city", billing.city)}
              className={errors.city ? "error" : ""}
              required
            >
              <option value="">Select City *</option>
              {cities.map(city => (
                <option key={city.name} value={city.name}>{city.name}</option>
              ))}
            </select>
            {errors.city && <span className="error-message">{errors.city}</span>}
          </div>
        )}

        {cities.length === 0 && billing.country && (
          <div className="field-wrapper">
            <input 
              name="city" 
              placeholder="Town / City *" 
              value={billing.city}
              onChange={handleChange}
              onBlur={() => validateField("city", billing.city)}
              className={errors.city ? "error" : ""}
              required 
            />
            {errors.city && <span className="error-message">{errors.city}</span>}
          </div>
        )}

        {/* Address Fields */}
        <div className="field-wrapper">
          <input 
            name="address1" 
            placeholder="House number and street name *" 
            value={billing.address1}
            onChange={handleChange}
            onBlur={() => validateField("address1", billing.address1)}
            className={errors.address1 ? "error" : ""}
            required 
          />
          {errors.address1 && <span className="error-message">{errors.address1}</span>}
        </div>
        
        <div className="field-wrapper">
          <input 
            name="address2" 
            placeholder="Apartment, suite, unit (optional)" 
            value={billing.address2}
            onChange={handleChange}
          />
        </div>

        {/* ZIP */}
        <div className="field-wrapper">
          <input 
            name="zip" 
            placeholder="Postcode / ZIP *" 
            value={billing.zip}
            onChange={handleChange}
            onBlur={() => validateField("zip", billing.zip)}
            className={errors.zip ? "error" : ""}
            required 
          />
          {errors.zip && <span className="error-message">{errors.zip}</span>}
        </div>

        {/* Phone - Numbers only */}
        <div className="field-wrapper">
          <input 
            name="phone" 
            type="tel"
            placeholder="Phone * (numbers only)" 
            value={billing.phone}
            onChange={(e) => {
              // Only allow numbers
              const value = e.target.value.replace(/\D/g, '');
              setBilling({ ...billing, phone: value });
              validateField("phone", value);
            }}
            onBlur={() => validateField("phone", billing.phone)}
            className={errors.phone ? "error" : ""}
            required 
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        {/* Email */}
        <div className="field-wrapper">
          <input 
            name="email" 
            type="email" 
            placeholder="Email Address *" 
            value={billing.email}
            onChange={handleChange}
            onBlur={() => validateField("email", billing.email)}
            className={errors.email ? "error" : ""}
            required 
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        {/* IEC Code for non-India */}
        {billing.country && billing.country !== "India" && (
          <div className="field-wrapper">
            <input 
              name="iec" 
              placeholder="IEC Code (Import Export Code) *" 
              value={billing.iec}
              onChange={handleChange}
              onBlur={() => validateField("iec", billing.iec)}
              className={errors.iec ? "error" : ""}
              required
            />
            {errors.iec && <span className="error-message">{errors.iec}</span>}
          </div>
        )}

        {/* GST for India */}
        {billing.country === "India" && (
          <div className="field-wrapper">
            <input 
              name="gst" 
              placeholder="GST Number (optional)" 
              value={billing.gst}
              onChange={handleChange}
            />
          </div>
        )}

        {/* Notes */}
        <div className="field-wrapper">
          <textarea
            name="notes"
            placeholder="Order notes (optional)"
            value={billing.notes}
            onChange={handleChange}
          />
        </div>
      </div>

      {/* RIGHT – Order Summary */}
      <div className="checkout-right">
        <h3>Your Order</h3>


        <div className="order-box">
          {cart.map(item => {
            // Format attributes for display
            const attributeText = item.attributes && item.attributes.length > 0
              ? item.attributes.map(attr => `${attr.name}: ${attr.value}`).join(", ")
              : item.variantSku || "";

            const itemTotal = parseFloat(item.price) * item.qty;

            return (
              <div key={item.id} className="order-row">
                <span>
                  {item.productName} × {item.qty}
                  {attributeText && (
                    <>
                      <br />
                      <small>{attributeText}</small>
                    </>
                  )}
                </span>
                <span>{formatCurrency(itemTotal)}</span>
              </div>
            );
          })}

          <hr />

          <div className="order-row">
            <strong>Subtotal</strong>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>

          <div className="order-row">
            <span>Shipping</span>
            <span>{formatCurrency(shipping)}</span>
          </div>

          {billing.country === "India" && (
            <div className="order-row">
              <span>GST (18%)</span>
              <span>{formatCurrency(gst)}</span>
            </div>
          )}

          <div className="order-row total">
            <strong>Total</strong>
            <strong>{formatCurrency(total)}</strong>
          </div>
        </div>

        <div className="payment-box">
          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="razorpay"
              checked={billing.payment === "razorpay"}
              onChange={handleChange}
            />
            <span className="payment-label-text">Pay Online (Razorpay)</span>
          </label>
          {billing.payment === "razorpay" && (
            <div className="payment-info-box">
              <p style={{ marginBottom: '15px' }}>
                Pay securely using Razorpay. You can pay using Credit/Debit cards, UPI, Net Banking, and Wallets.
              </p>
            </div>
          )}

          <label className="payment-option">
            <input
              type="radio"
              name="payment"
              value="bank"
              checked={billing.payment === "bank"}
              onChange={handleChange}
            />
            <span className="payment-label-text">Direct Bank Transfer</span>
          </label>
          {billing.payment === "bank" && (
            <div className="payment-info-box">
              <p style={{ marginBottom: '15px' }}>
                Make your payment directly into our bank account. Please use your Order ID as the payment reference. Your order will not be shipped until the funds have cleared in our account.
              </p>
              
              <div className="bank-details">
                <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>Bank Details:</h4>
                <div className="bank-info-row">
                  <span className="bank-label">Bank Name:</span>
                  <span className="bank-value">State Bank of India</span>
                </div>
                <div className="bank-info-row">
                  <span className="bank-label">Account Holder Name:</span>
                  <span className="bank-value">RK Industries</span>
                </div>
                <div className="bank-info-row">
                  <span className="bank-label">Account Number:</span>
                  <span className="bank-value">1234567890123456</span>
                </div>
                <div className="bank-info-row">
                  <span className="bank-label">IFSC Code:</span>
                  <span className="bank-value">SBIN0001234</span>
                </div>
              </div>

              <div className="payment-proof-upload" style={{ marginTop: '20px' }}>
                <label className="upload-label">
                  Upload Proof of Payment *
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="file-input"
                    id="payment-proof-upload"
                  />
                  <div className="upload-button">
                    {paymentProof ? (
                      <span className="file-name">✓ {paymentProof.name}</span>
                    ) : (
                      <span>Choose File</span>
                    )}
                  </div>
                </label>
                {paymentProof && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentProof(null);
                      document.querySelector('.file-input').value = '';
                    }}
                    className="remove-file-btn"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="privacy-text">
          Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our{" "}
          <a href="/privacy-policy">privacy policy</a>.
        </div>

        <button type="submit" className="place-order">
          Place Order
        </button>
      </div>
    </form>
  );
};

export default Checkout;
