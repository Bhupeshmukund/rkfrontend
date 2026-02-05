import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import './EmailFloat.css';

const EmailFloat = () => {
  const email = 'rkindustriesexports@gmail.com';
  const subject = 'Inquiry about RK Industries';
  const body = 'Hello! I would like to know more about your products.';
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={mailtoUrl}
      className="email-float"
      aria-label="Contact us via Email"
    >
      <FontAwesomeIcon icon={faEnvelope} className="email-icon" />
      <span className="email-tooltip">Email us</span>
    </a>
  );
};

export default EmailFloat;
