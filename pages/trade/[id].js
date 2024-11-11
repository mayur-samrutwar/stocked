import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import { useAccount, useBalance } from 'wagmi';
import { ArrowUpCircle, ArrowDownCircle } from 'react-feather';

export default function TradePage() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address,
    token: '0x...' // Add your USDT contract address here
  });

  const [selectedTime, setSelectedTime] = useState(120); // 2 mins default
  const [betAmount, setBetAmount] = useState('');
  const [error, setError] = useState('');

  const chartContainerRef = useRef(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chart, setChart] = useState(null);

  // Wait for id to be available
  useEffect(() => {
    if (id) {
      setIsLoading(false);
    }
  }, [id]);

  // Timer Logic
  useEffect(() => {
    if (!id) return;
    
    if (timeLeft === 0) {
      setTimeLeft(300);
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, id]);

  // Format timer to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chart initialization
  useEffect(() => {
    if (!id || !chartContainerRef.current) return;

    const chartInstance = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        borderColor: '#f0f0f0',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chartInstance.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const fetchChartData = async () => {
      try {
        const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
          params: {
            symbol: `${id?.toUpperCase()}USDT`,
            interval: '1m',
            limit: 100
          }
        });

        const chartData = response.data.map(d => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4])
        }));

        candlestickSeries.setData(chartData);
        setCurrentPrice(chartData[chartData.length - 1].close);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      }
    };

    fetchChartData();
    const dataInterval = setInterval(fetchChartData, 1000);

    // Handle resize
    const handleResize = () => {
      chartInstance.applyOptions({
        width: chartContainerRef.current.clientWidth
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(dataInterval);
      window.removeEventListener('resize', handleResize);
      chartInstance.remove();
    };
  }, [id]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setBetAmount('');
      setError('');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      setError('Please enter a valid number');
      return;
    }

    if (balance && numValue > parseFloat(balance.formatted)) {
      setError('Amount exceeds balance');
      return;
    }

    setBetAmount(value);
    setError('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header */}
      <div className="flex items-center space-x-6 mb-8">
        <div className="w-12 h-12 relative bg-white rounded-full p-2 shadow-sm">
          <img
            src={`/crypto-icons/${id?.toLowerCase()}.png`}
            alt={id}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/crypto-icons/default.png';
            }}
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {id?.toUpperCase()}/USDT
          </h1>
          {currentPrice && (
            <p className="text-xl text-gray-500">
              ${currentPrice.toFixed(2)}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Chart Section */}
        <div className="flex-grow">
          <div 
            ref={chartContainerRef} 
            className="w-full h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm"
          />
        </div>

        {/* Trading Section */}
        <div className="w-96 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Time Selection */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Time Frame</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className={`py-3 px-4 rounded-lg transition-all ${
                  selectedTime === 120 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedTime(120)}
              >
                2 Minutes
              </button>
              <button 
                className={`py-3 px-4 rounded-lg transition-all ${
                  selectedTime === 300 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedTime(300)}
              >
                5 Minutes
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">Trade Amount</p>
            <div className="space-y-2">
              <input
                type="number"
                value={betAmount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg 
                          focus:outline-none focus:ring-2 focus:ring-gray-400 
                          text-gray-900 placeholder-gray-400"
              />
              {balance && (
                <div className="text-sm text-gray-500">
                  Balance: {parseFloat(balance.formatted).toFixed(2)} USDT
                </div>
              )}
              {error && (
                <div className="text-sm text-red-500">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Trading Buttons */}
          <div className="space-y-3">
            <button 
              className={`w-full py-4 px-4 rounded-lg transition-all border border-4 border-gray-900
                        flex items-center justify-center gap-2 font-semibold
                        ${!betAmount || error 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              onClick={() => console.log('Up')}
              disabled={!betAmount || error}
            >
              <ArrowUpCircle size={20} />
              Up
            </button>
            
            <button 
              className={`w-full py-4 px-4 rounded-lg transition-all border border-4 border-gray-900
                        flex items-center justify-center gap-2 font-semibold
                        ${!betAmount || error 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-white text-gray-900 hover:bg-gray-100'}`}
              onClick={() => console.log('Down')}
              disabled={!betAmount || error}
            >
              <ArrowDownCircle size={20} />
              Down
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
