import React from 'react';
import { toast } from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { Transak } from '@transak/transak-sdk';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api-client';

interface TransakWidgetProps {
  onSuccess?: (data: unknown) => void;
  onClose?: () => void;
  defaultAmount?: number;
  disabled?: boolean;
}

const getTransakBaseUrl = (env: string) => {
  if (env === 'PRODUCTION') return 'https://global.transak.com';
  return 'https://global-stg.transak.com';
};

const safeParseAmount = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Number(parsed.toFixed(6));
};

const extractOrderData = (payload: any) => {
  const status = payload?.status || {};
  const orderId =
    status.id ||
    payload?.id ||
    payload?.orderId ||
    payload?.eventData?.id ||
    payload?.data?.id;

  const amount =
    safeParseAmount(status.cryptoAmount) ||
    safeParseAmount(payload?.cryptoAmount) ||
    safeParseAmount(payload?.eventData?.cryptoAmount);

  const currency = String(
    status.cryptoCurrency ||
      payload?.cryptoCurrency ||
      payload?.eventData?.cryptoCurrency ||
      'USDC',
  ).toUpperCase();

  return {
    orderId: orderId ? String(orderId) : '',
    amount,
    currency,
  };
};

export const TransakWidget: React.FC<TransakWidgetProps> = ({
  onSuccess,
  onClose,
  defaultAmount = 50,
  disabled = false,
}) => {
  const { address } = useAccount();
  const { user } = useAuth();

  const openTransak = async () => {
    if (disabled) return;

    const apiKey = import.meta.env.VITE_TRANSAK_API_KEY as string | undefined;
    const env = String(import.meta.env.VITE_TRANSAK_ENV || 'STAGING').toUpperCase();

    if (!apiKey) {
      toast.error('Transak não configurado. Defina VITE_TRANSAK_API_KEY.');
      return;
    }

    if (!address) {
      toast.error('Conecte sua carteira primeiro.');
      return;
    }

    const baseUrl = getTransakBaseUrl(env);
    const params = new URLSearchParams({
      apiKey,
      environment: env,
      defaultCryptoCurrency: 'USDC',
      cryptoCurrencyList: 'USDC,USDT',
      defaultNetwork: 'polygon',
      networks: 'polygon',
      defaultFiatCurrency: 'BRL',
      fiatCurrency: 'BRL',
      defaultFiatAmount: String(defaultAmount),
      walletAddress: address,
      email: user?.email || '',
      themeColor: '8b5cf6',
      hostURL: window.location.origin,
      redirectURL: window.location.origin,
      productsAvailed: 'BUY',
      isFeeCalculationHidden: 'false',
    });

    const widgetUrl = `${baseUrl}?${params.toString()}`;

    const transak = new Transak({
      widgetUrl,
      referrer: window.location.origin,
      widgetHeight: '600px',
      widgetWidth: '450px',
    });

    transak.init();

    Transak.on(Transak.EVENTS.TRANSAK_WIDGET_CLOSE, () => {
      onClose?.();
    });

    Transak.on(Transak.EVENTS.TRANSAK_ORDER_SUCCESSFUL, async (orderPayload) => {
      const orderData = extractOrderData(orderPayload);

      if (!orderData.orderId) {
        toast.error('Não foi possível identificar o pedido do Transak.');
        return;
      }

      try {
        await api.registerTransakDeposit({
          orderId: orderData.orderId,
          amount: orderData.amount > 0 ? orderData.amount : defaultAmount,
          currency: orderData.currency,
          fiatAmount: defaultAmount,
        });
      } catch (error) {
        console.error('Erro ao registrar depósito Transak:', error);
      }

      toast.success('Depósito iniciado! O crédito será confirmado em instantes.');
      onSuccess?.(orderPayload);
      transak.close();
    });
  };

  return (
    <button
      type="button"
      onClick={() => void openTransak()}
      disabled={disabled}
      className="w-full rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 py-3 font-medium text-white transition-all hover:from-green-500 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
       Depositar com PIX ou Cartão
    </button>
  );
};
