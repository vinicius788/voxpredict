import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const ConnectWalletButton: React.FC = () => {
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
