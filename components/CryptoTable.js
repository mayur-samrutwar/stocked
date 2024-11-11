import { useState, useEffect } from 'react';
import axios from 'axios';

export default function CryptoTable() {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);

  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];

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
      'BNBUSDT': 'Binance Coin',
      'XRPUSDT': 'Ripple',
      'ADAUSDT': 'Cardano'
    };
    return names[symbol];
  };

  return (
    <div className="p-8 bg-cream min-h-screen flex items-center justify-center">
      <table className="w-3/4 bg-white rounded-lg overflow-hidden shadow-lg">
        <thead className="bg-dark-cream">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Symbol</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Price (USDT)</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">24h Change</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">5m Change</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="6" className="px-4 py-2 text-center">Loading...</td>
            </tr>
          ) : (
            cryptoData.map((crypto) => (
              <tr key={crypto.symbol}>
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <img
                      src={`/crypto-icons/${crypto.symbol.toLowerCase().replace('usdt', '')}.png`}
                      alt={crypto.name}
                      className="w-6 h-6 mr-2"
                    />
                    {crypto.symbol}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">{crypto.name}</td>
                <td className="px-4 py-2 whitespace-nowrap">
                  ${parseFloat(crypto.price).toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={crypto.priceChange24h > 0 ? 'text-green-600' : 'text-red-600'}>
                    {crypto.priceChange24h.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={crypto.priceChange5m > 0 ? 'text-green-600' : 'text-red-600'}>
                    {crypto.priceChange5m.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Trade
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
