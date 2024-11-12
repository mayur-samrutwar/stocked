import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function CryptoTable() {
  const router = useRouter();
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get 24hr price change data
        const [tickerResponse, klines5mResponse] = await Promise.all([
          axios.get('https://api.binance.com/api/v3/ticker/24hr', {
            params: { symbols: JSON.stringify(symbols) }
          }),
          Promise.all(
            symbols.map(symbol =>
              axios.get('https://api.binance.com/api/v3/klines', {
                params: {
                  symbol: symbol,
                  interval: '5m',
                  limit: 1
                }
              })
            )
          )
        ]);

        const processedData = tickerResponse.data.map((ticker, index) => {
          const openPrice5m = parseFloat(klines5mResponse[index].data[0][1]);
          const currentPrice = parseFloat(ticker.lastPrice);
          const priceChange5m = ((currentPrice - openPrice5m) / openPrice5m) * 100;

          return {
            symbol: ticker.symbol,
            name: getTokenName(ticker.symbol),
            price: currentPrice,
            priceChange24h: parseFloat(ticker.priceChangePercent),
            priceChange5m: priceChange5m
          };
        });

        setCryptoData(processedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching crypto data:', error);
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 2000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const getTokenName = (symbol) => {
    const names = {
      'BTCUSDT': 'Bitcoin',
      'ETHUSDT': 'Ethereum',
      'SOLUSDT': 'Solana',
      'DOGEUSDT': 'Dogecoin'
    };
    return names[symbol];
  };

  const handleTrade = (symbol) => {
    const baseSymbol = symbol.replace('USDT', '').toLowerCase();
    router.push(`/trade/${baseSymbol}`);
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Markets</h1>
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-white border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Asset</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Price</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">24h Change</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">5m Change</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-700"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                  </div>
                </td>
              </tr>
            ) : (
              cryptoData.map((crypto) => (
                <tr key={crypto.symbol} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 relative bg-white rounded-full p-1.5 shadow-sm mr-3">
                        <img
                          src={`/crypto-icons/${crypto.symbol.toLowerCase().replace('usdt', '')}.png`}
                          alt={crypto.name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/crypto-icons/default.png';
                          }}
                        />
                      </div>
                      <span className="font-medium text-gray-900">{crypto.symbol}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    {crypto.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">
                      ${parseFloat(crypto.price).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      crypto.priceChange24h > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {crypto.priceChange24h > 0 ? '+' : ''}{crypto.priceChange24h.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      crypto.priceChange5m > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {crypto.priceChange5m > 0 ? '+' : ''}{crypto.priceChange5m.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button 
                      onClick={() => handleTrade(crypto.symbol)}
                      className="py-2 px-4 rounded-lg transition-all
                               bg-gray-900 text-white hover:bg-gray-800"
                    >
                      Trade
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
