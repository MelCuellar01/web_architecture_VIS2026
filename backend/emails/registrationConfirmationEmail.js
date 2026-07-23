import React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

const containerStyle = {
  margin: '0 auto',
  padding: '40px 24px',
  fontFamily: 'Arial, Helvetica, sans-serif',
  backgroundColor: '#f5f0e8',
};

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '16px',
  padding: '32px',
  border: '1px solid #e6dccd',
};

const buttonStyle = {
  display: 'inline-block',
  backgroundColor: '#61c4b4',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '14px 24px',
  textDecoration: 'none',
  fontWeight: '700',
};

export function RegistrationConfirmationEmail({ loginUrl }) {

  return React.createElement(
    Html,
    { lang: 'en' },
    React.createElement(Head, null),
    React.createElement(Preview, null, 'Your WanderNotes account is ready'),
    React.createElement(
      Body,
      { style: { margin: 0, backgroundColor: '#f5f0e8' } },
      React.createElement(
        Container,
        { style: containerStyle },
        React.createElement(
          Section,
          { style: cardStyle },
          React.createElement(Heading, { style: { margin: '0 0 16px', color: '#2a241e' } }, 'Welcome to WanderNotes'),
          React.createElement(
            Text,
            { style: { margin: '0 0 16px', color: '#3d362e', lineHeight: '1.6' } },
            'Your registration was successful. You can now sign in and continue building your travel diary.'
          ),
          React.createElement(
            Button,
            { href: loginUrl, style: buttonStyle },
            'Log in to WanderNotes'
          ),
          React.createElement(
            Text,
            { style: { margin: '20px 0 0', color: '#7e7060', fontSize: '14px', lineHeight: '1.5' } },
            'If the button does not work, use this link: ',
            React.createElement(Link, { href: loginUrl, style: { color: '#3ea696' } }, loginUrl)
          )
        )
      )
    )
  );
}

export default RegistrationConfirmationEmail;