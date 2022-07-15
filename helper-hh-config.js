const { ethers } = require("hardhat")

const networkConfig = {
    31337: {
        name: "localhost",
        // vrf je mock..
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x0000000000000000000000000000000000000000000000000000000000000000", // mock.. (ale bez 64 nul to nejede..) musi byt bytes
        callbackGasLimit: "500000",
        repeatInterval: "110",
    },
    // vrfCoordinatorV2 Address, values can be obtained at https://docs.chain.link/docs/vrf-contracts/#rinkeby-testnet
    /*42: {
        name: "kovan",
        vrfCoordinatorV2: "",
    },*/
    4: {
        name: "rinkeby",
        vrfCoordinatorV2: "0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        subscriptionId: "8223",
        callbackGasLimit: "500000",
        repeatInterval: "110",
    },
}

// tady urcime local chainy, kde se budou muset deploynout mocks !
const developmentChains = ["hardhat", "localhost"]

// constructor VRFCoordinatorV2 mock
const BASE_FEE = ethers.utils.parseEther("0.25") // 0.25LINK / request. (on rinkeby - premium)
// pricefeed jsou sponzorovany protokoly, takze jsou zadax. Tohle neni, tak musime cvakat

// chainlink nodes plati gas pri generovani nahodnych cisel a volani nasich funkci
// gas se odviji od aktualni ceny ETH,LINK.. stale se meni
// tady to dame zatim natvrdo
const GAS_PRICE_LINK = 1e9 // 1000000000

const FUND_VRF_SUB = ethers.utils.parseEther("10") // 10 LINK

// diky tomuhle pak muzeme krasne importovat na zacatku scriptu
module.exports = {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
    FUND_VRF_SUB,
}
