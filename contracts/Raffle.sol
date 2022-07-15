// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol"; // kvuli automatickemu spousteni diky LINK Keepers

error Raffle__TooLowEnterFeeYouFuck();
error Raffle__TransferFailureSoSad();
error Raffle__ItIsNotOpenDude();
// tady error co zobrazi i hodnoty (duvody proc nastala chyba)
error Raffle__NotTheRightTime(
    uint256 timeStamp,
    uint256 numberOfPlayers,
    uint256 status,
    uint256 balance
);

contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /* TYPE declarations */

    enum RaffleState {
        OPEN,
        CALCULATING_WINNER,
        CLOSED
    } // values will be 0, 1, 2

    /* STATE VARS */
    uint256 private immutable i_enterFee;
    address payable[] private s_participants; // payable kvuli budoucimu vyplaceni winnera
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant HOW_MANY_YOU_WANNA = 1;

    // Lottery VARs
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_howOftenRepeat;

    /* EVENTS */
    event NewLotteryEnter(address indexed participant); // v indexed se da vyhledavat (nejsou zakodovane ABI) ani FBI,CIA etc...
    event RequestedRandomWinner(uint256 indexed requestId);
    event WeHaveNewWinnerBitches(address indexed winner);

    constructor(
        address vrfCoordinatorV2,
        uint256 _entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 repeatInterval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_enterFee = _entranceFee; // definuju only once and never change
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane; // key hash of max gas
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState.OPEN; // stejne jako RaffleState(0);
        s_lastTimeStamp = block.timestamp;
        i_howOftenRepeat = repeatInterval;
    }

    // public bo je pro kazdeho a payable bo vstupni poplatek..
    function enterLottery() public payable {
        // podminka co je chaper than revert (error definovany na zacatku scriptu)
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__ItIsNotOpenDude();
        }
        if (msg.value < i_enterFee) {
            revert Raffle__TooLowEnterFeeYouFuck();
        }
        s_participants.push(payable(msg.sender)); // pry by bez payable nefungovalo.. v minule lottery fungovalo.. (asi kvuli call metode)
        emit NewLotteryEnter(msg.sender);
    }

    /**
     * @dev This is the function that the LINK Keepers nodes call
     * they look for the "upkeepNeeded" to return true
     * In order to return true we need:
     * 1. Time interval should have passed
     * 2. At least 2 players (because of stagind test i put just one..) in lottery and some ETH in it (edit to 3)
     * 3. Some link in subscription
     * 4. Raffle has to be in the OPEN state! (if waitin for calculate a winner it has to be in CALCULATING state - no players can join)
     */

    // funkce override z interface KeeperCompatibleInterface
    // calldata sem musel zmenit na memory, abych v performUpkeep mohl fci zavolat pro vyvolani pripadne chyby nesplnenych podminek
    // calldata nefunguji se stringem
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool timeToRepeat = ((block.timestamp - s_lastTimeStamp) > i_howOftenRepeat);
        bool enoughParticipants = (s_participants.length > 3);
        bool isOpen = (s_raffleState == RaffleState(0)); // nebo RaffleState.OPEN
        bool hasBalance = (address(this).balance >= (i_enterFee * 3)); // chci tam uz dva hrace s minimalnim vkladem

        upkeepNeeded = (timeToRepeat && enoughParticipants && isOpen && hasBalance); // kdyz bude tohle vsechno true, tak zavolame "performUpkeep"

        // We don't use the checkData in this example. The checkData is defined when the Upkeep was registered.
        // a proto ani nevracime performData. Diky checkData muzeme volat vsecho mozne, ne jen "performUpkeep"!!
    }

    // ted prejmenuju fci requestWinnerRandom() na performUpkeep(), ktera je z interface KeeperCompatibleInterface
    // a je to to, co chci vykonat (a link node to automaticky zavola), kdyz ubehne nastaveny cas (a vsechny ostatni podminky v "checkUpkeep")

    // navic musime pridat overeni podminek protoze takhle muze kazdy zavolat tuhle fci aniz by byly splneny!
    // kvuli tomu jsme checkUpkeep() zmenili z external na public
    function performUpkeep(
        bytes calldata /*performData*/
    ) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            // tentokrat do erroru dame par promennych, aby se vedelo, proc error nastal (za jakych podminek)
            revert Raffle__NotTheRightTime(
                (block.timestamp - s_lastTimeStamp),
                s_participants.length,
                uint256(s_raffleState),
                address(this).balance
            );
        }

        s_raffleState = RaffleState.CALCULATING_WINNER; // ostatni nemuzou ted joinovat lotteriu!
        // zavolame "requestRandomWords" fci contractu VRFCoordinatorV2, ktera vraci "requestId", takze si ho ulozime pri volani
        // toto je fce ktera vola node a generuje nahodne cisla, potom zavola skrz callback fulfillrandomness
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, // key hash of gasLane -> maximum gas which we are willing to spent
            i_subscriptionId, // id of subscription with some funds to pay to chainlink nodes (oracles)
            REQUEST_CONFIRMATIONS, // how long to wait before respond, longer waiting means higher security of randomness
            i_callbackGasLimit, // how much gas you want to spend on calling "fulfillRandomWords" function
            HOW_MANY_YOU_WANNA // how many random numbers the chainlink node has to return
        );
        // redundant - nadbytecne (requestRandomWords z vrf uz ma taky event kde uklada requestid!)
        // ten event je viditelny i pro nas contract, kde volame tuhle funkci. takze tenhle muzeme klidne smazat
        emit RequestedRandomWinner(requestId);
    }

    // toto je callback fce kterou chainlink node zavola s vygenerovanymi cisly!
    // requestId nepouzijeme, proto ho musime zakomentovat (ale nechame uint256 bo fce je s nim volana..)
    // vstup je pole bo muzeme mit vice cisel
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        // random number je takovyto format: 102503485885626792317485692630742230393400109885594782175601736258490979091907
        // pouzijeme modulo abysme meli mensi cislo a mohli vybirat z naseho pole adress viteze
        // a % n (vysledek je nejake cislo 0 az n-1) coz je perfektni pro vyber z pole treba o 11 prvcich (n=10, kde vysledek je 0 az 10)

        // mame jen jedno cislo, takze bereme z pole index 0
        uint256 winnerId = randomWords[0] % s_participants.length;
        address payable theBestWinner = s_participants[winnerId];
        s_recentWinner = theBestWinner;
        (bool success, ) = theBestWinner.call{value: address(this).balance}(""); // poslu vsechno vitezi
        // more gas efficient than require:
        if (!success) {
            revert Raffle__TransferFailureSoSad();
        } else {
            // az kdyz vse vyplatim vitezi
            emit WeHaveNewWinnerBitches(theBestWinner);
            s_raffleState = RaffleState.OPEN; // patrick to mel jeste pred vyplacenim..
            s_participants = new address payable[](0); // vytvori nove pole o velikosti 0 (reset ucastniku pro novou loterii)
            s_lastTimeStamp = block.timestamp; // reset casu (aktualni - nove otevrena loterie)
        }
    }

    /* READ (view / pure) FNCTIONS - from private vars */
    // fce vesmes slouzi pro pozdejsi testovani contractu v HH

    function getEnterFee() public view returns (uint256) {
        return i_enterFee;
    }

    function getParticipant(uint256 _index) public view returns (address) {
        return s_participants[_index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    // zde dame pure, duvod jasny (promena je v bytecodu, ne na blockchainu)
    function getNumWors() public pure returns (uint256) {
        return HOW_MANY_YOU_WANNA;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getNumberOfParticipants() public view returns (uint256) {
        return s_participants.length;
    }

    function getRecentTimestamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getInterval() public view returns (uint256) {
        return i_howOftenRepeat;
    }
}
