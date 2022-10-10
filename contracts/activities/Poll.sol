//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../Interaction.sol";
import "../expander/interfaces/IDAOExpander.sol";
import "../IAutID.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Polls {
    using Counters for Counters.Counter;

    event PollCreated(uint256 _id, string _uri);
    event PollClosed(uint256 _id, string _uri);

    address public discordBot;
    Counters.Counter private idCounter;

    Poll[] private polls;
    IDAOExpander private daoExpander;

    struct Poll {
        uint256 timestamp;
        string pollData;
        string results;
        bool isFinalized;
        uint256 role;
        uint256 dueDate;
    }

    modifier onlyDiscordBot() {
        require(discordBot == msg.sender, "Only discord bot!");
        _;
    }

    constructor(IDAOExpander _daoExpander, address _discordBot) {
        require(address(_daoExpander) != address(0), "no community address");
        require(
            _daoExpander.isAdmin(msg.sender),
            "Only admin!"
        );

        daoExpander = _daoExpander;
        discordBot = _discordBot;
    }

    function create(
        uint256 _role,
        uint256 _dueDate,
        string memory _uri
    ) public returns (uint256) {
        require(bytes(_uri).length > 0, "No URI");

        uint256 pollID = idCounter.current();

        polls.push(Poll(block.timestamp, _uri, "", false, _role, _dueDate));
        idCounter.increment();

        emit PollCreated(pollID, _uri);
        return pollID;
    }

    function close(
        uint256 pollID,
        string calldata results,
        address[] calldata participants
    ) public onlyDiscordBot {
        require(
            polls[pollID].dueDate < block.timestamp,
            "Due date not reached yet."
        );
        require(!polls[pollID].isFinalized, "already finalized");
        require(bytes(results).length > 0, "Results file empty");

        for (uint256 i = 0; i < participants.length; i++) {
            if (
                daoExpander.isMember(participants[i]) &&
                uint256(
                    IAutID(IDAOExpander(daoExpander).getAutIDAddress())
                        .getMembershipData(
                            participants[i],
                            address(daoExpander)
                        )
                        .role
                ) ==
                polls[pollID].role
            )
                Interaction(IDAOExpander(daoExpander).getInteractionsAddr())
                    .addInteraction(pollID, participants[i]);
        }

        polls[pollID].isFinalized = true;
        polls[pollID].results = results;

        emit PollClosed(pollID, results);
    }

    function getById(uint256 id) public view returns (Poll memory poll) {
        return polls[id];
    }

    function getIDCounter() public view returns (uint256) {
        return idCounter.current() - 1;
    }

    function getDAOExpander() public view returns (address) {
        return address(daoExpander);
    }
}
