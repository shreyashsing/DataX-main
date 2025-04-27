export const AIVerificationAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_dataNFTContract",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "EmptyAnalysisReport",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyCID",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDatasetHash",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidURIFormat",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVerificationHash",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAuthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ScoreOutOfRange",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "VerificationDoesNotExist",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "dataNFTContract",
        "type": "address"
      }
    ],
    "name": "DataNFTContractSet",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "datasetHash",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "verificationHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "isVerified",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "qualityScore",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "anomalies",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "duplicates",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "diversity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "biasScore",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "datasetCID",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "analysisReport",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "DatasetVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "previousAdminRole",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "newAdminRole",
        "type": "bytes32"
      }
    ],
    "name": "RoleAdminChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleGranted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "RoleRevoked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "VerifierAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "VerifierRemoved",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "DEFAULT_ADMIN_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VERIFIER_ROLE",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "addVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dataNFTContract",
    "outputs": [
      {
        "internalType": "contract IDataNFT",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "roleId",
        "type": "bytes32"
      }
    ],
    "name": "getRoleAdmin",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "datasetHash",
        "type": "bytes32"
      }
    ],
    "name": "getLatestVerification",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "verificationHash",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "isVerified",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "version",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "qualityScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "anomalies",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duplicates",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "diversity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "biasScore",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "datasetCID",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "analysisReport",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "internalType": "struct AIVerification.Verification",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "datasetHash",
        "type": "bytes32"
      }
    ],
    "name": "getLatestVersion",
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
        "internalType": "bytes32",
        "name": "datasetHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "version",
        "type": "uint256"
      }
    ],
    "name": "getVerification",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "verificationHash",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "isVerified",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "version",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "qualityScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "anomalies",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duplicates",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "diversity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "biasScore",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "datasetCID",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "analysisReport",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "tokenId",
            "type": "uint256"
          }
        ],
        "internalType": "struct AIVerification.Verification",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "grantRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "hasRole",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "datasetHash",
        "type": "bytes32"
      }
    ],
    "name": "isDatasetVerified",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "verifier",
        "type": "address"
      }
    ],
    "name": "removeVerifier",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "renounceRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "role",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "revokeRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_dataNFTContract",
        "type": "address"
      }
    ],
    "name": "setDataNFTContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "datasetHash",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "verificationHash",
            "type": "bytes32"
          },
          {
            "internalType": "bool",
            "name": "isVerified",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "qualityScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "anomalies",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duplicates",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "diversity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "biasScore",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "datasetCID",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "analysisReport",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "isPrivate",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "metadataURI",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "decryptionKey",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "recipient",
            "type": "address"
          }
        ],
        "internalType": "struct AIVerification.VerificationInput",
        "name": "input",
        "type": "tuple"
      }
    ],
    "name": "verifyDataset",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const; 