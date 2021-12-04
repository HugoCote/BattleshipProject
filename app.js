class Ship {
    size
    hits
    id
    constructor(size) {
        this.size = size
        this.hits = Array.from({ length: size }, () => false);
        this.id = Symbol('Ship');
    }
    // Factory
    static FromLength(size) {
        return (new Ship(size));
    }
    getSize() {
        return this.size;
    }
    getId() {
        return this.id;
    }
    hit(n) {
        if (n < 0 || n > this.size) throw Error(`Invalid position ${n} in ${this}`)
        this.hits[n] = true
    }
    isSunk() {
        return this.hits.every(hit => hit === true);
    }
    toString() {
        return `Ship(n=${this.size}, ${JSON.stringify(this.hits)})`
    }

}

class GameBoard {
    width
    height
    ships
    tiles // mapping from tiles to ships informations {ship, n, horizontal}
    hits
    done
    constructor(width, height) {
        this.width = width
        this.height = height
        this.ships = []
        this.tiles = {}
        this.hits = []
    }
    static From({ width, height = null } = {}) {
        return new GameBoard(width, height ? height : width)
    }

    peek(...coordinates) {
        let [x, y] = coordinates
        if (x < 0 || this.width <= x) throw Error(`Coordinates x invalid in ${coordinates}`)
        if (y < 0 || this.height <= y) throw Error(`Coordinates y invalid in ${coordinates}`)
        const content = this.tiles[coordinates]
        if (!content) return null;
        return content;
    }
    placeAt(ship, coordinates, { horizontal } = { horizontal: true }) {
        let [x, y] = coordinates;
        const onTiles = Array.from({ length: ship.size }, (v, k) =>
            [x + (horizontal ? k : 0), y + (horizontal ? 0 : k)]
        )
        const contents = onTiles.map(xy => this.peek(...xy));
        const isFree = contents.every(content => content === null);
        if (!isFree) throw Error(`Cannot place ship @(${coordinates}), wrong placement @${JSON.stringify(onTiles)}. Already taken : ${JSON.stringify(Object.keys(this.tiles))}. Intersect with ${JSON.stringify(contents)}`);
        onTiles.forEach((coordinates, n) => {
            this.tiles[coordinates] = { ship, n, horizontal, }
        })
        this.ships.push(ship);
    }
    receiveAttack(coordinates) {
        let content = this.peek(...coordinates)
        // console.log("Received attack at coordinates : " + coordinates)
        this.hits.push(String(coordinates));
        // console.log("Current hits : " + JSON.stringify(this.hits))
        if (!content) return false;
        content.ship.hit(content.n);
        return true;
    }
    isDone() {
        return this.ships.every(ship => ship.isSunk());
    }
}

class Player {
    name
    ownBoardGame
    otherPlayer
    constructor(name) {
        if (!name) throw Error("You have to give the player a name")
        this.name = name;
        this.ownBoardGame = null;
        this.otherPlayer = null;
    }
    static buildHumain(name) {
        return new Humain(name);
    }
    static buildComputer(name) {
        return new Computer(name);
    }
    toString() {
        return `Player(name=${this.name})`;
    }
    isReady() {
        const setup = this.name && this.otherPlayer && this.ownBoardGame
        if (!setup) return false;
        try {
            return this.ownBoardGame.ships.length > 0;
        }
        catch (e) {
            return false;
        }
    }
    isDead() {
        return this.ownBoardGame.isDone();
    }
    using(ownBoardGame) {
        this.ownBoardGame = ownBoardGame;
        return this;
    }
    against(otherPlayer) {
        this.otherPlayer = otherPlayer;
        return this;
    }
    async placeShips() {
        throw Error("Method not defined, define in computer child class");
    }
    playOnce() {
        throw Error("Method not defined, define in child class");
    }
    isComputer() {
        return false;
    }
    isHumain() {
        return false;
    }
}

class Computer extends Player {
    constructor(name) {
        super(name)
        this.turn = 0;
    }
    async placeShips(ships) {
        let bg = this.ownBoardGame;
        let rowIndex = 0;
        for (const ship of ships) {
            bg.placeAt(ship, [0, rowIndex], { horizontal: true })
            rowIndex++;
        }
    }
    playOnce() {
        // attacks from left to right from y=0 increasing
        let bg = this.otherPlayer.ownBoardGame;
        const xTarget = this.turn % bg.width;
        const yTarget = Math.floor(this.turn / bg.width);
        bg.receiveAttack([xTarget, yTarget])
        this.turn++;
    }
    isComputer() {
        return true;
    }
}

class Humain extends Player {
    playQueue
    constructor(name) {
        super(name)
        this.playQueue = []
    }
    playThisNext(coordinates) {
        this.playQueue.push(coordinates);
    }
    async placeShips(ships, placeHook) {
        console.log(`Waiting for ${this} to place ${ships.length} ships`)
        await placeHook(this, ships);
    }
    placeShip(ship, coordinates, { horizontal } = { horizontal: true }) {
        this.ownBoardGame.placeAt(ship, coordinates, { horizontal: horizontal })
    }
    playOnce() {
        if (this.playQueue.length === 0) throw Error(this + " has no queued turn!");
        let coordinates = this.playQueue.shift()
        this.otherPlayer.ownBoardGame.receiveAttack(coordinates);
    }
    isHumain() {
        return true;
    }
}


class Game {
    players
    turnCount
    winner
    constructor() {
        this.players = {
            0: null,
            1: null,
        }
        this.turnCount = 0;
        this.winner = null;
    }

    setPlayer(index, player) {
        this.players[index] = player;
        if (this.players[0] && this.players[1]) {
            this.players[0].against(this.players[1]);
            this.players[1].against(this.players[0]);
        }
    }

    setPlayer1(player) {
        this.setPlayer(0, player)
    }

    setPlayer2(player) {
        this.setPlayer(1, player)
    }

    async giveTurn(player) {
        const currentPlayer = this.whoseTurn()
        if (player !== currentPlayer) throw Error("Wrong player bitch")
        if (this.isDone()) throw Error("Game's over bitch!")
        currentPlayer.playOnce();
        if (this.isDone()) {
            this.winner = this.players[0].isDead() ? this.players[1] : this.players[0];
        } else {
            this.turnCount++;
        }
        return;
    }

    whoseTurn() {
        return this.players[this.turnCount % 2];
    }

    start() {
        if (!this.isReady()) throw Error("Game is not ready, cant start it yet!");
    }

    isReady() {
        return this.players[0].isReady() && this.players[1].isReady()
    }

    isDone() {
        return this.players[0].isDead() || this.players[1].isDead()
    }

    static FromDummyGameSetup() {
        let gbPlayer1 = GameBoard.From({ width: 10, height: 10 });
        let gbPlayer2 = GameBoard.From({ width: 10, height: 10 });
        let ship0 = Ship.FromLength(3);
        let ship1 = Ship.FromLength(3);
        let ship2 = Ship.FromLength(2);
        gbPlayer1.placeAt(ship0, [0, 0], { horizontal: false });
        gbPlayer2.placeAt(ship1, [0, 0]);
        gbPlayer2.placeAt(ship2, [0, 1]);
        gbPlayer1.receiveAttack([0, 1]);
        gbPlayer1.receiveAttack([1, 0]);
        gbPlayer2.receiveAttack([1, 1]);
        gbPlayer2.receiveAttack([2, 2]);
        let player1 = Player.buildHumain('Player 1 (you)').using(gbPlayer1);
        let player2 = Player.buildComputer('Player 2 (computer easy)').using(gbPlayer2);

        let game = new Game();
        game.setPlayer1(player1);
        game.setPlayer2(player2);
        return game;
    }
}

// export { Ship, GameBoard, Player, Game }

// ############################################
// ########### Graphical display ##############
// ############################################

let currentBoatSelectedForDragAndDrop = null;

function boatDragStart() {
    setTimeout(() => this.classList.add("invisible"), 50);
    document.querySelectorAll(".boardgame").forEach(boardgameDiv => boardgameDiv.classList.add("hovered"))
    currentBoatSelectedForDragAndDrop = this;
}
function boatDragEnd() {
    this.classList.remove("invisible")
    document.querySelectorAll(".boardgame").forEach(boardgameDiv => boardgameDiv.classList.remove("hovered"))
    currentBoatSelectedForDragAndDrop = null;
}

function getDragAndDropTargetCoordinates(targetElement) {
    const boatSize = +currentBoatSelectedForDragAndDrop.getAttribute('size');
    const boatOrient = currentBoatSelectedForDragAndDrop.hasAttribute('horizontal');
    let [x, y] = [+targetElement.getAttribute('x'), +targetElement.getAttribute('y')]
    const targetCoordinates = Array.from({ length: boatSize },
        (v, k) => String([x + (boatOrient ? k : 0), y + (boatOrient ? 0 : k)])
    )
    return targetCoordinates;
}

function boatDragOver(mouseEvent) {
    if (!currentBoatSelectedForDragAndDrop) return false;
    mouseEvent.preventDefault();
}

function boatDragEnter(mouseEvent) {
    if (!currentBoatSelectedForDragAndDrop) return false;
    mouseEvent.preventDefault();

    const otherSquares = this.parentNode.squareMap;
    const targetCoordinates = getDragAndDropTargetCoordinates(this);
    for (const coordinates of Object.keys(otherSquares)) {
        if (targetCoordinates.includes(coordinates)) continue;
        otherSquares[coordinates].classList.remove("hovered");
    }
    for (const targetCoordinate of targetCoordinates) {
        const targetSquare = otherSquares[targetCoordinate];
        if (!targetSquare) continue;
        targetSquare.classList.add("hovered");
    }

}
function boatDragLeave(mouseEvent) {
}

function boatDragDrop(mouseEvent) {
    const boatSize = +currentBoatSelectedForDragAndDrop.getAttribute('size');
    const boatOrient = currentBoatSelectedForDragAndDrop.hasAttribute('horizontal');
    let [x, y] = [+this.getAttribute('x'), +this.getAttribute('y')]
    const targetCoordinates = getDragAndDropTargetCoordinates(this);
    const otherSquares = this.parentNode.squareMap;
    for (const coordinates of Object.keys(otherSquares)) {
        otherSquares[coordinates].classList.remove("hovered");
    }
    console.log("Dropped at " + `(${x}, ${y}) a boat of size ${boatSize} (horizontal? ${boatOrient}) targeting : ${JSON.stringify(targetCoordinates)}`)

    let wantsToPlaceShip = new CustomEvent('placeShip', {
        bubbles: true,
        detail: {
            coordinates: [x, y],
            horizontal: boatOrient,
            shipId: currentBoatSelectedForDragAndDrop.shipId,
            boatSelectedDiv: currentBoatSelectedForDragAndDrop,
        }
    });
    this.dispatchEvent(wantsToPlaceShip);
}

function makeBoats(ships) {
    let contentDiv = document.createElement("div");
    contentDiv.classList.add("boat-bank")
    for (const ship of ships) {
        const boatSize = ship.getSize();
        const shipId = ship.getId();
        let boatDiv = document.createElement("div");
        boatDiv.classList.add("boat")
        boatDiv.setAttribute('size', boatSize);
        boatDiv.toggleAttribute('horizontal');
        boatDiv.shipId = shipId;
        boatDiv.draggable = true;
        boatDiv.addEventListener('dragstart', boatDragStart);
        boatDiv.addEventListener('dragend', boatDragEnd);
        boatDiv.addEventListener('click', () => boatDiv.toggleAttribute('horizontal'));
        for (let i = 0; i < boatSize; i++) {
            let boatNode = document.createElement("div");
            boatNode.classList.add("boat-node")
            // boatNode.style["grid-column"] = i + 1
            // boatNode.style["grid-row"] = 1
            boatDiv.appendChild(boatNode);
        }
        contentDiv.appendChild(boatDiv);
    }
    return contentDiv;
}

function makeGrid(newGridSize, enableDragAndDrop) {
    const newGrid = document.createElement("div");
    newGrid.squareMap = {}
    newGrid.classList.add("board-grid");

    for (let i = 0; i < newGridSize; i++) {
        for (let j = 0; j < newGridSize; j++) {
            const newSquare = document.createElement("div");
            newSquare.setAttribute("class", "square");
            newSquare.setAttribute("x", i);
            newSquare.setAttribute("y", j);
            newSquare.style["grid-column"] = i + 2
            newSquare.style["grid-row"] = j + 2
            newSquare.onclick = () => targetSquare(newSquare);
            if (enableDragAndDrop) {
                newSquare.addEventListener('dragover', boatDragOver);
                newSquare.addEventListener('dragenter', boatDragEnter);
                newSquare.addEventListener('dragleave', boatDragLeave);
                newSquare.addEventListener('drop', boatDragDrop);
            }
            newGrid.appendChild(newSquare);
            newGrid.squareMap[[i, j]] = newSquare;
        }
    }

    // top label for columns
    for (let i = 0; i < newGridSize; i++) {
        const newSquareLabel = document.createElement("div");
        newSquareLabel.classList.add("square-label")
        newSquareLabel.classList.add("x-label")
        newSquareLabel.style["grid-column"] = i + 2
        newSquareLabel.style["grid-row"] = 1
        newSquareLabel.textContent = +i + 1
        newGrid.appendChild(newSquareLabel);
    }

    // left label for rows
    for (let i = 0; i < newGridSize; i++) {
        const rowLabel = String.fromCharCode("A".charCodeAt() + i);
        const newSquareLabel = document.createElement("div");
        newSquareLabel.classList.add("square-label")
        newSquareLabel.classList.add("y-label")
        newSquareLabel.style["grid-column"] = 1
        newSquareLabel.style["grid-row"] = i + 2
        newSquareLabel.textContent = rowLabel
        newGrid.appendChild(newSquareLabel);
    }

    return newGrid;
}

function suddenSpawnAudio() {
    const audioDiv = document.getElementById("dashboard-audio")
    "Soundtrack_24_-_Das_Boot_Theme.webm.part";
}

function updateGrid(grid, boardgame, { hidden } = { hidden: false }) {
    const boatTiles = Object.keys(boardgame.tiles);
    const hitTiles = boardgame.hits;
    // console.log(hitTiles)
    // console.log(boatTiles)

    for (const boatTile of boatTiles) {
        if (!hidden) grid.squareMap[boatTile].classList.add("boat");
        else if (hitTiles.includes(boatTile)) {
            grid.squareMap[boatTile].classList.add("boat");
        }
    }

    for (const hitTile of hitTiles) {
        grid.squareMap[hitTile].classList.add("hit");
    }
}

function updateBoards(boardgame1, boardgame2, game) {
    const boards = {
        0: boardgame1,
        1: boardgame2,
    }
    for (const index of [0, 1]) {
        const grid = boards[index].querySelector(".board-grid");
        const player = game.players[index];
        const boardgame = player.ownBoardGame;
        const options = { hidden: player.isComputer() };
        updateGrid(grid, boardgame, options)
        // updateGrid(boardgame1.querySelector(".board-grid"), game.players[0].ownBoardGame)
    }
}

function getMessageBoard() {
    return document.querySelector(".message-board");
}

function getReloadButton() {
    return document.querySelector("button#reload");
}

function targetSquare(square) {
    const boardgame = square.parentNode;
    let [x, y] = [+square.getAttribute("x"), +square.getAttribute("y")]
    console.log(`User clicked ${boardgame.id} (${x + 1},${y + 1})`)

    let wantsToPlay = new CustomEvent("turn", {
        bubbles: true,
        detail: { coordinates: [x, y], }
    });
    square.dispatchEvent(wantsToPlay);
}

async function userClickBoardgame(boardgame) {
    let userInput = new Promise(resolve => {
        boardgame.addEventListener('turn', (event) => {
            new Audio("./media/explosion.ogg").play().catch((e) => {
                console.log("Can't read audio! " + e)
            });
            resolve(event.detail.coordinates);
        }, options = { once: true });
    })
    let coordinates = await userInput;
    console.log(`Coordinates ${coordinates} registered!`);
    return coordinates;
}

async function userDragAndDropsAllBoats(boardgame, game, player, ships) {
    console.log(`Waiting for drag and drop of ${ships.length} ships`);
    let messageBoard = getMessageBoard();
    let dashboardContent = document.querySelector(".dashboard-content")
    let dashboardMessage = dashboardContent.querySelector(".dashboard-message")
    let boardgame1 = document.getElementById("board-1");
    let boardgame2 = document.getElementById("board-2");

    let boatDiv = makeBoats(ships);
    for (const boatNode of dashboardContent.querySelectorAll(".boat-bank")) boatNode.remove()
    dashboardContent.appendChild(boatDiv);

    let mapShipPlacement = {}
    let mapShipFromId = {}
    for (const ship of ships) {
        mapShipFromId[ship.getId()] = ship
        mapShipPlacement[ship.getId()] = false
    }
    allShipsArePlaced = () => Object.getOwnPropertySymbols(mapShipPlacement).every(id => mapShipPlacement[id])

    let placeShip = (event) => {
        const coordinates = event.detail.coordinates;
        const horizontal = event.detail.horizontal;
        const shipId = event.detail.shipId;
        const ship = mapShipFromId[shipId]
        const boatSelectedDiv = event.detail.boatSelectedDiv;

        try {
            player.placeShip(ship, coordinates, { horizontal: horizontal })
            mapShipPlacement[shipId] = true
            updateBoards(boardgame1, boardgame2, game);
            boatSelectedDiv.remove();
            if (allShipsArePlaced()) boardgame.dispatchEvent(new CustomEvent("placedAllBoats", { bubbles: true }));
        } catch (e) {
            console.log("Wrong ship placement faggot!" + e.message)
        }
    };
    boardgame.addEventListener('placeShip', placeShip);

    let userInput = new Promise(resolve => {
        boardgame.addEventListener('placedAllBoats', (event) => {
            resolve();
        }, options = { once: true });
    })
    messageBoard.textContent = "Place your ships! ";
    dashboardMessage.textContent = "Click to pivot...";
    await userInput;
    dashboardMessage.textContent = ""
    console.log("Done placing ships!");
    boardgame.removeEventListener('placeShip', placeShip);
}

async function placeBoats(game) {
    let boatsPlayer1 = [Ship.FromLength(2), Ship.FromLength(3), Ship.FromLength(4), Ship.FromLength(5)]
    let boatsPlayer2 = [Ship.FromLength(2), Ship.FromLength(3), Ship.FromLength(4), Ship.FromLength(5)]
    let boardgame1 = document.getElementById("board-1");
    await userDragAndDropsAllBoats(boardgame1, game, game.players[0], boatsPlayer1);
    // await game.players[0].placeShips(boatsPlayer1, async (player, ships) => await userDragAndDropsAllBoats(boardgame1, game, player, ships));
    await game.players[1].placeShips(boatsPlayer2);
}

async function queryTurn(game) {
    // 2 tour a la fois -> humain, computer
    let boardgame1 = document.getElementById("board-1");
    let boardgame2 = document.getElementById("board-2");

    let messageBoard = getMessageBoard();
    let reloadButton = getReloadButton();
    reloadButton.disabled = true;
    while (!game.isDone()) {
        let player = game.whoseTurn();
        messageBoard.textContent = `À vous de jouer!`;

        let coordinates = await userClickBoardgame(boardgame2);
        player.playThisNext(coordinates);
        try {
            await game.giveTurn(game.whoseTurn());
            await game.giveTurn(game.whoseTurn());
        }
        catch (e) {
            console.log(e.message); // game over
        }

        updateBoards(boardgame1, boardgame2, game);
    }
    reloadButton.disabled = false;
    if (game.isDone()) {
        messageBoard.textContent = `Joueur ${game.winner.name} à gagné!`;
    } else {
        messageBoard.textContent = `Partie abandonnée!`;
    }
}

function refreshGame() {
    let boardgamesDiv = document.querySelector(".boardgames")
    let boardgame1 = document.getElementById("board-1");
    let boardgame2 = document.getElementById("board-2");
    let dashboardContent = document.querySelector(".dashboard-content")

    let gbPlayer1 = GameBoard.From({ width: 10, height: 10 });
    let gbPlayer2 = GameBoard.From({ width: 10, height: 10 });
    let player1 = Player.buildHumain('You').using(gbPlayer1);
    let player2 = Player.buildComputer('Computer easy)').using(gbPlayer2);
    let game = new Game();
    game.setPlayer1(player1);
    game.setPlayer2(player2);

    boardgamesDiv.querySelectorAll(".boardgame").forEach(bgDiv => {
        for (const child of bgDiv.querySelectorAll("div"))
            child.classList.contains("label") || child.remove();
        const index = bgDiv.getAttribute('index');
        const enableDrapgAndDropOfBoats = index == 0;
        let grid = makeGrid(10, enableDrapgAndDropOfBoats);
        grid.setAttribute('id', `grid-${index}`);
        grid.setAttribute('index', index);
        bgDiv.appendChild(grid);
    })

    updateBoards(boardgame1, boardgame2, game);
    placeBoats(game).then(() => queryTurn(game));
}

function setupPage() {
    if (typeof document === 'undefined') return; // silently ignore non-DOM running env
    console.log("Page setup");
    let reloadButton = getReloadButton();
    reloadButton.onclick = () => refreshGame();
    reloadButton.click();
}

setupPage()