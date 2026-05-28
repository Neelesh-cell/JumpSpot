import * as React from 'react';

interface WaitlistWelcomeProps {
  position: number;
  referralCode: string;
  appUrl: string;
}

export const WaitlistWelcome: React.FC<WaitlistWelcomeProps> = ({
  position,
  referralCode,
  appUrl,
}) => {
  const shareLink = `${appUrl}?ref=${referralCode}`;

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', color: '#333' }}>
      <h2 style={{ color: '#000' }}>You're on the list! 🎉</h2>
      <p style={{ fontSize: '16px' }}>
        Your current position is <strong>#{position}</strong>.
      </p>
      <div style={{ margin: '24px 0', padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          <strong>Want to move up?</strong> Share this link to jump the queue:
        </p>
        <a 
          href={shareLink} 
          style={{ color: '#0070f3', textDecoration: 'none', wordBreak: 'break-all', fontSize: '16px' }}
        >
          {shareLink}
        </a>
      </div>
      <p style={{ marginTop: '20px', fontSize: '16px', color: '#555' }}>
        🎁 <strong>Refer 3 friends to jump 200 spots!</strong>
      </p>
    </div>
  );
};

export default WaitlistWelcome;
