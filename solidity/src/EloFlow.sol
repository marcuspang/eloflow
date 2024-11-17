// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IGameResults {
    function getWins(address player) external view returns (uint256);
    function getLosses(address player) external view returns (uint256);
}

contract EloFlow {
    // Constants for Elo calculation
    uint256 private constant K_FACTOR = 32;
    uint256 private constant BASE_RATING = 1200;

    IGameResults public gameResults;
    mapping(address => uint256) public playerRatings;

    constructor(address _gameResults) {
        gameResults = IGameResults(_gameResults);
    }

    function calculateElo(address player) public view returns (uint256) {
        uint256 wins = gameResults.getWins(player);
        uint256 losses = gameResults.getLosses(player);

        if (wins + losses == 0) {
            return BASE_RATING;
        }

        uint256 winRate = (wins * 1000) / (wins + losses);

        // For 100% win rate (1000), change should be +32
        // For 0% win rate (0), change should be -32
        // For 50% win rate (500), change should be 0
        int256 ratingChange = ((int256(winRate) - 500) * int256(K_FACTOR)) / 500;
        int256 newRating = int256(BASE_RATING) + ratingChange;
        return newRating < 0 ? 0 : uint256(newRating);
    }

    function updateRating(address player) external {
        playerRatings[player] = calculateElo(player);
    }

    function getPlayerRating(address player) external view returns (uint256) {
        return playerRatings[player] == 0 ? calculateElo(player) : playerRatings[player];
    }
}
