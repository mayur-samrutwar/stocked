// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BinaryPrediction is Ownable, ReentrancyGuard {
    struct Bet {
        uint256 betId;
        string tokenType;
        uint256 startTime;
        uint256 expiryTime;
        uint256 betAmount;
        bool rewardStatus;
        uint256 payoutPercentage;
    }

    // Counter for bet IDs
    uint256 private betCounter;
    
    // Mapping from user address to their bets
    mapping(address => Bet[]) private userBets;
    
    // Events
    event BetCreated(address indexed user, uint256 betId, uint256 amount);
    event RewardClaimed(address indexed user, uint256 betId, uint256 amount);
    event ContractFunded(address indexed funder, uint256 amount);
    event FundsClaimed(address indexed owner, uint256 amount);

    constructor() Ownable(msg.sender) ReentrancyGuard() {
        betCounter = 1;
    }

    // Function to create a new bet
    function createBet(
        string memory tokenType,
        uint256 startTime,
        uint256 expiryTime,
        uint256 betAmount,
        uint256 payoutPercentage
    ) external payable nonReentrant {
        require(msg.value == betAmount, "Incorrect bet amount sent");
        require(startTime < expiryTime, "Invalid time parameters");
        require(payoutPercentage > 0, "Invalid payout percentage");

        Bet memory newBet = Bet({
            betId: betCounter,
            tokenType: tokenType,
            startTime: startTime,
            expiryTime: expiryTime,
            betAmount: betAmount,
            rewardStatus: false,
            payoutPercentage: payoutPercentage
        });

        userBets[msg.sender].push(newBet);
        
        emit BetCreated(msg.sender, betCounter, betAmount);
        betCounter++;
    }

    // Function to get all bets for a user
    function getBetsForUser(address user) external view returns (Bet[] memory) {
        return userBets[user];
    }

    // Function to claim reward
    function claimReward(uint256 betId) external nonReentrant {
        Bet[] storage userBetList = userBets[msg.sender];
        bool betFound = false;
        uint256 betIndex;

        // Find the bet with the given ID
        for (uint256 i = 0; i < userBetList.length; i++) {
            if (userBetList[i].betId == betId) {
                betFound = true;
                betIndex = i;
                break;
            }
        }

        require(betFound, "Bet not found");
        require(block.timestamp > userBetList[betIndex].expiryTime, "Bet not expired yet");
        require(!userBetList[betIndex].rewardStatus, "Reward already claimed");

        uint256 reward = userBetList[betIndex].betAmount + 
            (userBetList[betIndex].betAmount * userBetList[betIndex].payoutPercentage / 100);

        require(address(this).balance >= reward, "Insufficient contract balance");

        userBetList[betIndex].rewardStatus = true;
        
        (bool success, ) = payable(msg.sender).call{value: reward}("");
        require(success, "Transfer failed");

        emit RewardClaimed(msg.sender, betId, reward);
    }

    // Function to fund the contract
    function fundContract() external payable {
        require(msg.value > 0, "Must send some ETH");
        emit ContractFunded(msg.sender, msg.value);
    }

    // Function for admin to claim contract funds
    function claimContractFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to claim");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Transfer failed");
        
        emit FundsClaimed(owner(), balance);
    }

    // Function to get contract balance
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}