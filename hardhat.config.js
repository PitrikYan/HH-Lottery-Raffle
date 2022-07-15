require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */

// je dobre definovat "nebo" kdyby ty promene neexistovali (.env)
const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "http://nejaka.jina.rpc.url"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x05fdsww33nejakyjinyprivatekey"
const ETHERSCAN_API = process.env.ETHERSCAN_API || "blabla"
const COINMARKETCAP_API = process.env.COINMARKETCAP_API || "blabla"

module.exports = {
    solidity: "0.8.9",

    defaultNetwork: "hardhat",

    networks: {
        hardhat: {
            chainId: 31337,
            blockConfirmations: 1, // muzu si definovat pro kazdy chain
        },
        rinkeby: {
            url: RINKEBY_RPC_URL,
            accounts: PRIVATE_KEY !== undefined ? [PRIVATE_KEY] : [], // [] pole hodnot account
            chainId: 4,
            blockConfirmations: 6, // muzu si definovat pro kazdy chain
        },
    },

    gasReporter: {
        enabled: false, // ted je vyply
        //outputFile: "gas-report.txt",
        noColours: true,
        currency: "USD",
        //coinmarketcap: COINMARKETCAP_API,
        token: "BNB",
    },

    etherscan: {
        apiKey: {
            rinkeby: ETHERSCAN_API,
        },
    },

    namedAccounts: {
        strejdaKarel: {
            default: 0,
        },
        participant: {
            default: 1,
        },
        participant2: {
            default: 2,
        },
    },
    // timeout pro Promise, raffle.once, emit eventu do 200 sekund
    mocha: {
        timeout: 650000, // mlsecs - 650 secs
    },
}
