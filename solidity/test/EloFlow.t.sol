// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {EloFlow} from "../src/EloFlow.sol";

contract MockGameResults {
    mapping(address => uint256) private wins;
    mapping(address => uint256) private losses;

    function setWinLoss(address player, uint256 _wins, uint256 _losses) external {
        wins[player] = _wins;
        losses[player] = _losses;
    }

    function getWins(address player) external view returns (uint256) {
        return wins[player];
    }

    function getLosses(address player) external view returns (uint256) {
        return losses[player];
    }
}

contract EloFlowTest is Test {
    EloFlow public eloFlow;
    MockGameResults public mockResults;
    address public player1;
    address public player2;

    function setUp() public {
        mockResults = new MockGameResults();
        eloFlow = new EloFlow(address(mockResults));
        player1 = address(0x1);
        player2 = address(0x2);
    }

    function testInitialRating() public {
        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1200, "Initial rating should be 1200");
    }

    function testPerfectRecord() public {
        mockResults.setWinLoss(player1, 10, 0);
        eloFlow.updateRating(player1);

        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1232, "Perfect record should increase rating");
    }

    function testPoorRecord() public {
        mockResults.setWinLoss(player1, 0, 10);
        eloFlow.updateRating(player1);

        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1168, "Poor record should decrease rating");
    }

    function testEvenRecord() public {
        mockResults.setWinLoss(player1, 5, 5);
        eloFlow.updateRating(player1);

        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1200, "50% win rate should maintain base rating");
    }

    function testRatingPersistence() public {
        mockResults.setWinLoss(player1, 10, 0);
        eloFlow.updateRating(player1);

        mockResults.setWinLoss(player1, 0, 10);

        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1232, "Rating should persist until updated");
    }

    function testMultiplePlayers() public {
        mockResults.setWinLoss(player1, 10, 0);  // Perfect record
        mockResults.setWinLoss(player2, 0, 10);  // Poor record

        eloFlow.updateRating(player1);
        eloFlow.updateRating(player2);

        assertEq(eloFlow.getPlayerRating(player1), 1232, "Player1 should have high rating");
        assertEq(eloFlow.getPlayerRating(player2), 1168, "Player2 should have low rating");
    }

    function testZeroGames() public {
        mockResults.setWinLoss(player1, 0, 0);
        eloFlow.updateRating(player1);

        uint256 rating = eloFlow.getPlayerRating(player1);
        assertEq(rating, 1200, "Zero games should return base rating");
    }
}