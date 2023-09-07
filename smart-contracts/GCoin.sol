// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface SemaphoreInterface {
    function createGroup(
        uint256 groupId,
        uint256 merkleTreeDepth,
        address admin
    ) external;

    function addMember(uint256 groupId, uint256 identityCommitment) external;

    function verifyProof(
        uint256 groupId,
        uint256 merkleTreeRoot,
        uint256 signal,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata proof
    ) external;
}

interface ReclaimContractInterface {
    struct CompleteClaimData {
		bytes32 identifier;
		address owner;
		uint32 timestampS;
		uint256 epoch;
	}
	struct ClaimInfo {
		string provider;
		string parameters;
		string context;
	}
    struct Witness {
		address addr;
		string host;
	}
    struct Epoch {
		uint32 id;
		uint32 timestampStart;
		uint32 timestampEnd;
		Witness[] witnesses;
		uint8 minimumWitnessesForClaimCreation;
	}
    function assertValidEpochAndSignedClaim(uint32 epochNum, ClaimInfo memory claimInfo, CompleteClaimData memory claimData, bytes[] memory signatures) external view;
}

contract C_GCoin is ERC20 {
    address public owner;
    address public semaphoreAddress;
    address public reclaimContractAddress;
    uint256 public groupId;
    uint256 public merkleTreeDepth;

    // mapping (bytes32 => bool) public registeredList;
    mapping (bytes32 => uint8) public registeredList;   // comment this line and uncomment above line on prod version

    constructor(address _semaphoreAddress, uint256 _groupId, uint256 _merkleTreeDepth, address _reclaimContractAddress) ERC20("GCoin", "GCON") {
        owner = msg.sender;
        groupId = _groupId;
        semaphoreAddress = _semaphoreAddress;
        merkleTreeDepth = _merkleTreeDepth;
        SemaphoreInterface(semaphoreAddress).createGroup(groupId, merkleTreeDepth, address(this));
        reclaimContractAddress = _reclaimContractAddress;
    }

    function verifyProofAndRegisterMember(
        uint32 epochNum,
        string memory provider,
        string memory parameters,
        string memory context,
		ReclaimContractInterface.CompleteClaimData memory claimData,
		bytes[] memory signatures,
        uint256 _identityCommitment
        ) external {
            // Ensure correct provider
            bool isCorrectProvider = keccak256(abi.encodePacked(provider)) == keccak256(abi.encodePacked("google-login"));
            require(isCorrectProvider, "The provider is not google-login");
            
            // Compute claimInfo and call assertValid..() from Reclaim SC.
		    ReclaimContractInterface.ClaimInfo memory claimInfo = ReclaimContractInterface.ClaimInfo(provider, parameters, context);
            ReclaimContractInterface(reclaimContractAddress).assertValidEpochAndSignedClaim(epochNum, claimInfo, claimData, signatures);

            // Check if the parameter is not registered yet by mapping the hash and store the hash.
            bytes32 hash = keccak256(abi.encodePacked(parameters));
            // require(registeredList[hash]==false, "Candidate already registered");
            // registeredList[hash] = true;
            registeredList[hash]+=1; // comment this line and uncomment the above 2 line on prod version.

            // Add the member
            SemaphoreInterface(semaphoreAddress).addMember(groupId, _identityCommitment);
    }

    function airDropTo(
        uint256 _merkleTreeRoot,
        uint256 _signal,
        uint256 _nullifierHash,
        uint256 _externalNullifier,
        uint256[8] calldata _proof
        ) external {

        require(_externalNullifier == 100, "The external nullifier is required to be 100.");

        // use signal to represent the airdrop. This is used in place of contextAddress to avoid doxxing and frontrunning.
        address receiver = address(uint160(_signal));

        SemaphoreInterface(semaphoreAddress).verifyProof(groupId, _merkleTreeRoot, _signal, _nullifierHash, _externalNullifier, _proof);
        _mint(receiver, 100 * (10 ** decimals()));
    }
}

// Semaphore Address: 0x3889927F0B5Eb1a02C6E2C20b39a1Bd4EAd76131
// Reclaim Address: 0xF93F605142Fb1Efad7Aa58253dDffF67775b4520
// Witness Address: 0x244897572368Eadf65bfBc5aec98D8e5443a9072