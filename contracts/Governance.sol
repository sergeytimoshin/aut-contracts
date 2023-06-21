// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./expander/interfaces/IDAOExpander.sol";
import "./IAutID.sol";

/// @title Governance
/// @notice Simple governance contract for DAOs. Used for voting on proposals.
contract Governance {
    IDAOExpander public daoExpander;
    uint256 private proposalCounter;
    
    struct Proposal {
        string metadataCID;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
    }

    // Mapping of proposal ID to proposal details
    mapping (uint256 => Proposal) public proposals;

    // Mapping of proposal ID to member address to vote status
    mapping (uint256 => mapping (address => bool)) public hasVoted;

    constructor(address _daoExpander) {
        daoExpander = IDAOExpander(_daoExpander);        
        require(daoExpander.isMemberOfOriginalDAO(msg.sender), "Only DAO members allowed");
    }

    // Create a new proposal
    function createProposal(
        uint256 startTime,
        uint256 endTime,
        string memory metadataCID
    ) external onlyDAOMember {
        proposals[proposalCounter] = Proposal(
            metadataCID,
            startTime,
            endTime,
            0,
            0
        );
        proposalCounter++;
    }

    // Compute vote weight per role 
    function weightPerRole(uint256 role) public pure returns (uint32) {
        if (role == 1) { return 10; }
        if (role == 2) { return 21; }
        if (role == 3) { return 18; }
        return 0;
    }

    // Vote on a proposal
    function vote(uint256 proposalID, bool isYes) external onlyDAOMember {
        require(!hasVoted[proposalID][msg.sender], "Already voted");
        require(
            proposals[proposalID].startTime <= block.timestamp && proposals[proposalID].endTime >= block.timestamp, 
            "Invalid voting time");

        hasVoted[proposalID][msg.sender] = true;

        IAutID autId = IAutID(daoExpander.getAutIDAddress());
        IAutID.DAOMember memory member = autId.getMembershipData(msg.sender, address(daoExpander));
        if (isYes) {
            proposals[proposalID].yesVotes += weightPerRole(member.role);
        } else {
            proposals[proposalID].noVotes += weightPerRole(member.role);
        }
    }

    // Get proposal details
    function getProposal(uint256 proposalID) external view returns (
        string memory metadataCID,
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes
    ) {
        return (
            proposals[proposalID].metadataCID,
            proposals[proposalID].startTime,
            proposals[proposalID].endTime,
            proposals[proposalID].yesVotes,
            proposals[proposalID].noVotes
        );
    }

    // Get all active proposal IDs
    function getActiveProposalIDs() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < proposalCounter; i++) {
            if (proposals[i].endTime >= block.timestamp) {
                count++;
            }
        }

        uint256[] memory activeProposals = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < proposalCounter; i++) {
            if (proposals[i].endTime >= block.timestamp) {
                activeProposals[index] = i;
                index++;
            }
        }
        return activeProposals;
    }

    function getProposalCount() external view returns (uint256) {
        return proposalCounter;
    }

    modifier onlyDAOMember {
        require(daoExpander.isMemberOfOriginalDAO(msg.sender), "Only DAO members allowed");
        _;
    }
}