// Test script to deploy a minimal token
// This bypasses the complex DataToken contract
export const MinimalTokenAbi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name_",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol_",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "allowance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// This is actually just the OpenZeppelin ERC20 bytecode - much simpler than our DataToken
export const MinimalTokenBytecode = "0x608060405234801561001057600080fd5b5060405161091e38038061091e83398101604081905261002f91610113565b600361003b8382610225565b5060046100488282610225565b505050610322565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261007857600080fd5b81516001600160401b038082111561009257610092610051565b604051601f8301601f19908116603f011681019082821181831017156100ba576100ba610051565b816040528381526020925086838588010111156100d657600080fd5b600091505b8382101561010557858201830151818301908452908401610118565b600093810190920192909252949350505050565b6000806040838503121561012657600080fd5b82516001600160401b038082111561013d57600080fd5b61014986838701610067565b9350602085015191508082111561015f57600080fd5b5061016c85828601610067565b9150509250929050565b600181811c9082168061018a57607f821691505b6020821081036101aa57634e487b7160e01b600052602260045260246000fd5b50919050565b601f8211156102205760008160011c6101e157634e487b7160e01b600052602160045260246000fd5b6001810190506020808511156101f957600181601f1901831617610220565b600083815260209020601f19821690868612156000811561021357509482905b826121df565b87860151878511156102205762ffffff191683529085019084016101f9565b505050505b505050565b81516001600160401b0381111561023e5761023e610051565b61025281610244845461017b565b846101b0565b602080601f83116001811461028d576000841561026f5750858301515b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600386901b1c1916600185901b1785556102f3565b6001600386901b1c198116895284879560018201918886116102cf5787559450610293565b600085815260209020601f19841690600086815260209020825b878511156102c357815185810151825585018491909101606001610273565b5085821015156102e75787850151600019600388901b60f8161c911617610293565b5050602098909801979650505050505050565b50610220856102df565b6105ed806103316000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c80633950935111610071578063395093511461012357806370a082311461013657806395d89b411461015f578063a457c2d714610167578063a9059cbb1461017a578063dd62ed3e1461018d57600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101c6565b6040516100c3919061044c565b60405180910390f35b6100df6100da366004610486565b610258565b60405190151581526020016100c3565b6002545b6040519081526020016100c3565b6100df61010f3660046104b0565b610272565b604051601281526020016100c3565b6100df610131366004610486565b610296565b6100f36101443660046104ec565b6001600160a01b031660009081526020819052604090205490565b6100b66102bd565b6100df610175366004610486565b6102cc565b6100df610188366004610486565b61034d565b6100f361019b36600461050e565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b6060600380546101d590610541565b80601f016020809104026020016040519081016040528092919081815260200182805461020190610541565b801561024e5780601f106102235761010080835404028352916020019161024e565b820191906000526020600020905b81548152906001019060200180831161023157829003601f168201915b5050505050905090565b6000336102668185856103cb565b60019150505b92915050565b600033610280858285610510565b610286858585610378565b506001949350505050565b6000336102668185856102a983836101ab565b6102b3919061057c565b6103cb565b6060600480546101d590610541565b600033816102da82866101ab565b9050838110156103405760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b60648201526084015b60405180910390fd5b61028682868684036103cb565b6000336102668185856103cb90565b6001600160a01b0383166103df5760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610337565b6001600160a01b0382166104405760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610337565b6001600160a01b0392831660009081526001602090815260408083209490951682529390935290922055565b60206000808301818452808284018201850182818151815260200191508051906020019080838360005b8381101561048c578181015183820152602001610474565b50505050905090810190601f1680156104b95780820380516001836020036101000a031916815260200191505b5094505050505090565b6000806000606084860312156104c557600080fd5b83356001600160a01b03811681146104dc57600080fd5b95602085013595506040909401359392505050565b60006020828403121561049f57600080fd5b81356001600160a01b0381168114610507576104f7610047565b9392505050565b6000806040838503121561052157600080fd5b82356001600160a01b0381168114610538576105386104ec565b9392505050565b600181811c9082168061055557607f821691505b6020821081036105755764148e5360e31b600052602260045260246000fd5b50919050565b808201808211156102575770148e5360e31b6000526020600452602060008201910152600080fd5b634e487b7160e01b600052601160045260246000fdfea26469706673582212201e0a4e56b92e9af3ad8bab5ed59d3387cf32ad85afa78c68246ffc7fedb2bc4a64736f6c63430008140033"; 