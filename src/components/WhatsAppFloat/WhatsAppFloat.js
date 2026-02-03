import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import './WhatsAppFloat.css';

const WhatsAppFloat = () => {
  // WhatsApp number - using the first phone number from header
  const phoneNumber = '918685933785'; // +91-8685933785 without + and -
  const message = 'Hello! I would like to know more about your products.';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Contact us on WhatsApp"
    >
      <FontAwesomeIcon icon={faWhatsapp} className="whatsapp-icon" />
      <span className="whatsapp-tooltip">Chat with us</span>
    </a>
  );
};

export default WhatsAppFloat;

