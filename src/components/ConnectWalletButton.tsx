import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ConnectWalletButton: React.FC = () => {
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (!isSignedIn || isAdminRoute) {
    return null;
  }

  return (
    <div className="connect-wallet-rk">
      <ConnectButton
        label="Conectar Carteira"
        showBalance={false}
        chainStatus="icon"
        accountStatus={{
          smallScreen: 'avatar',
          largeScreen: 'address',
        }}
      />
    </div>
  );
};
