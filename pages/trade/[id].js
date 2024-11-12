import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useContractRead, useChainId } from 'wagmi';
import { ArrowUpCircle, ArrowDownCircle } from 'react-feather';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { parseEther, formatEther } from 'viem';
import stockedABI from '../../contract/abi/stocked.json';
import { networks } from '@/config';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS; 

export default function TradePage() {
  const router = useRouter();
  const { id } = router.query;
  const { address } = useAccount();
  const { data: balance } = useBalance({
    address
  });

  const [selectedTime, setSelectedTime] = useState(120);
  const [betAmount, setBetAmount] = useState('');
  const [error, setError] = useState('');
  const [currentPrice, setCurrentPrice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 500,
  });
  const [timeLeft, setTimeLeft] = useState(300); // Start with 5 minutes (300 seconds)
  const [userBets, setUserBets] = useState([]);

  const PAYOUT = 50;

  const chainId = useChainId();

  const getCurrentChainInfo = () => {
    const currentChain = networks.find(network => network.id === chainId);
    return currentChain?.nativeCurrency || {
      symbol: 'ETH',
      decimals: 18,
      name: 'Ether'
    };
  };

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
      // Reset timer based on selected time
      setTimeLeft(selectedTime);
      return;
    }

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, id, selectedTime]);

  // When selected time changes, reset the timer
  useEffect(() => {
    setTimeLeft(selectedTime);
  }, [selectedTime]);

  // Format timer to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Keep price update logic separate
  useEffect(() => {
    if (!id) return;

    const fetchPrice = async () => {
      try {
        const response = await axios.get(`https://api.binance.com/api/v3/ticker/price`, {
          params: {
            symbol: `${id?.toUpperCase()}USDT`
          }
        });
        setCurrentPrice(parseFloat(response.data.price));
      } catch (error) {
        console.error('Error fetching price:', error);
      }
    };

    fetchPrice();
    const priceInterval = setInterval(fetchPrice, 1000);

    return () => clearInterval(priceInterval);
  }, [id]);

  // Add window resize handler
  useEffect(() => {
    function handleResize() {
      const chartContainer = document.getElementById('chart-container');
      if (chartContainer) {
        setDimensions({
          width: chartContainer.clientWidth,
          height: 500,
        });
      }
    }

    handleResize(); // Initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch chart data
  useEffect(() => {
    if (!id) return;

    const fetchPriceData = async () => {
      try {
        const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
          params: {
            symbol: `${id?.toUpperCase()}USDT`,
            interval: '1m',
            limit: 100
          }
        });

        const formattedData = response.data.map(d => ({
          time: new Date(d[0]).toLocaleTimeString(),
          price: parseFloat(d[4]), // Using close price
        }));

        setChartData(formattedData);
        setCurrentPrice(formattedData[formattedData.length - 1].price);
      } catch (error) {
        console.error('Error fetching price data:', error);
      }
    };

    fetchPriceData();
    const interval = setInterval(fetchPriceData, 1000);
    return () => clearInterval(interval);
  }, [id]);

  const { data: betsData } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: stockedABI,
    functionName: 'getBetsForUser',
    args: [address],
    watch: true,
  });

  useEffect(() => {
    if (betsData) {
      setUserBets(betsData);
    }
  }, [betsData]);

  const formatTimestamp = (timestamp) => {
    return new Date(Number(timestamp) * 1000).toLocaleString();
  };

  const handleClaim = async (betId) => {
    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: stockedABI,
        functionName: 'claimReward',
        args: [BigInt(betId)],
      });
      console.log('Claim submitted for bet:', betId);
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  };

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

  const { writeContract, data: hash } = useWriteContract();

  const handleBet = async (betType) => {
    const startTime = Math.floor(Date.now() / 1000); // Current timestamp in seconds
    const expiryTime = startTime + selectedTime; // Add selected duration (120s or 300s)

    try {
      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: stockedABI,
        functionName: 'createBet',
        args: [
          id?.toLowerCase(), // tokenType
          betType, // 'up' or 'down'
          BigInt(startTime),
          BigInt(expiryTime),
          parseEther(betAmount), // Convert to wei
          BigInt(PAYOUT) // payoutPercentage
        ],
        value: parseEther(betAmount), // Send ETH with the transaction
      });

      console.log('Bet placed successfully');
    } catch (error) {
      console.error('Error placing bet:', error);
      setError('Failed to place bet. Please try again.');
    }
  };

  // Add this helper function near your other functions
  const calculatePercentage = (percentage) => {
    if (!balance) return '0';
    const amount = (parseFloat(balance.formatted) * percentage) / 100;
    return amount.toFixed(6); // Limit to 6 decimal places
  };

  // Add this function after the formatTimestamp function
  const checkPredictionResult = async (bet) => {
    try {
      // Get historical klines (candlestick) data that covers both timestamps
      const response = await axios.get(`https://api.binance.com/api/v3/klines`, {
        params: {
          symbol: `${bet.tokenType.toUpperCase()}USDT`,
          interval: '1m',
          startTime: Number(bet.startTime) * 1000, // Convert to milliseconds
          endTime: (Number(bet.expiryTime) * 1000) + 60000 // Add 1 minute to ensure we get the expiry candle
        }
      });

      if (!response.data || response.data.length < 2) {
        console.error('Insufficient price data');
        return false;
      }

      const startPrice = parseFloat(response.data[0][4]); // Close price of start candle
      const endPrice = parseFloat(response.data[response.data.length - 1][4]); // Close price of end candle

      // Compare prices based on bet type
      if (bet.betType === 'up') {
        return endPrice > startPrice;
      } else {
        return endPrice < startPrice;
      }
    } catch (error) {
      console.error('Error checking prediction:', error);
      return false;
    }
  };

  // Add this state for tracking prediction results
  const [predictionResults, setPredictionResults] = useState({});

  // Add this effect to check predictions for all eligible bets
  useEffect(() => {
    const checkBets = async () => {
      if (!userBets) return;

      const results = {};
      for (const bet of userBets) {
        // Only check completed, unclaimed bets
        if (!bet.rewardStatus && Number(bet.expiryTime) <= Date.now() / 1000) {
          results[bet.betId.toString()] = await checkPredictionResult(bet);
        }
      }
      setPredictionResults(results);
    };

    checkBets();
  }, [userBets]);

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
          <div className="w-full h-[500px] bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#8884d8" 
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trading Section */}
        <div className="w-96 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          {/* Time Selection */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Expiry Time</p>
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
              
              {/* Add percentage buttons */}
              <div className="flex gap-2 mt-2">
                {[5, 10, 20].map((percentage) => (
                  <button
                    key={percentage}
                    onClick={() => setBetAmount(calculatePercentage(percentage))}
                    className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 
                              text-gray-700 rounded-lg transition-colors"
                    disabled={!balance}
                  >
                    {percentage}%
                  </button>
                ))}
              </div>

              {balance && (
                <div className="text-sm text-gray-500">
                  Balance: {parseFloat(balance.formatted).toFixed(10)} {getCurrentChainInfo().symbol}
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
              className={`w-full py-3 px-4 rounded-lg transition-all
                        flex items-center justify-center gap-2
                        ${!betAmount || error 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              onClick={() => handleBet('up')}
              disabled={!betAmount || error}
            >
              <ArrowUpCircle size={20} />
              Up
            </button>
            
            <button 
              className={`w-full py-3 px-4 rounded-lg transition-all
                        flex items-center justify-center gap-2
                        ${!betAmount || error 
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              onClick={() => handleBet('down')}
              disabled={!betAmount || error}
            >
              <ArrowDownCircle size={20} />
              Down
            </button>
          </div>
        </div>
      </div>

      {/* User Bets Table */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">History</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white shadow-sm rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bet ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {userBets.map((bet) => (
                <tr key={bet.betId.toString()}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bet.betId.toString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bet.tokenType.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(bet.startTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatTimestamp(bet.expiryTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parseFloat(formatEther(bet.betAmount)).toFixed(10)} {getCurrentChainInfo().symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 rounded-full ${
                      bet.betType === 'up' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {bet.betType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                      {bet.rewardStatus ? 'Claimed' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => handleClaim(bet.betId)}
                      disabled={
                        bet.rewardStatus || 
                        Number(bet.expiryTime) > Date.now() / 1000 ||
                        !predictionResults[bet.betId.toString()]
                      }
                      className={`px-3 py-1 rounded-md ${
                        bet.rewardStatus || Number(bet.expiryTime) > Date.now() / 1000
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : predictionResults[bet.betId.toString()]
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-red-100 text-red-400 cursor-not-allowed'
                      }`}
                    >
                      {bet.rewardStatus 
                        ? 'Claimed'
                        : Number(bet.expiryTime) > Date.now() / 1000
                          ? 'Not Ready'
                          : predictionResults[bet.betId.toString()]
                            ? 'Claim'
                            : 'Lost'
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
