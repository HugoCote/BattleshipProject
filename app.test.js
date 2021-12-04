import { Ship, GameBoard, Player, Game } from './app'

describe('Ship API', () => {
    it('construction', () => expect(new Ship(5)).toBeDefined())
    it('factory', () => expect(Ship.FromLength(5)).toBeDefined())
    it('can be hit', () => expect(Ship.FromLength(5).hit).toBeDefined())
    it('can be sunk', () => {
        let ship = Ship.FromLength(3);
        expect(ship.isSunk()).toBe(false);
        ship.hit(0);
        expect(ship.isSunk()).toBe(false);
        ship.hit(1);
        expect(ship.isSunk()).toBe(false);
        ship.hit(2);
        expect(ship.isSunk()).toBe(true);
    })
})

describe('GameBoard API', () => {
    it('construction', () => expect(new GameBoard(10, 10)).toBeDefined())
    it('factory', () => expect(GameBoard.From({ width: 10, height: 10 })).toBeDefined())
    it('place ship', () => {
        let gameboard = GameBoard.From({ width: 10, height: 10 });
        let ship = Ship.FromLength(3);
        gameboard.placeAt(ship, [2, 3], { horizontal: false });
    });
    it('dimensions overflow', () => {
        let gameboard = GameBoard.From({ width: 3, height: 3 });
        expect(gameboard.peek(2, 2)).toBeDefined()
        expect(() => gameboard.peek(3, 3)).toThrow();
        expect(() => gameboard.peek(-1, 2)).toThrow();
        expect(() => gameboard.placeAt(Ship.FromLength(10), [0, 0])).toThrow();
    })
    it('ship cant intersect', () => {
        let gameboard = GameBoard.From({ width: 3, height: 3 });
        let ship1 = Ship.FromLength(3);
        let ship2 = Ship.FromLength(3);
        gameboard.placeAt(ship1, [0, 0], { horizontal: true });
        expect(() => gameboard.placeAt(ship2, [0, 0], { horizontal: false })).toThrow();
    })
    it('gameboard interaction', () => {
        let gameboard = GameBoard.From({ width: 3, height: 3 });
        let ship = Ship.FromLength(3);
        gameboard.placeAt(ship, [0, 0], { horizontal: true });
        expect(gameboard.receiveAttack([0, 0])).toBe(true);
        expect(gameboard.receiveAttack([1, 1])).toBe(false);
    })
    it('gameboard can tell if its done', () => {
        let gameboard = GameBoard.From({ width: 3, height: 3 });
        let ship = Ship.FromLength(3);
        gameboard.placeAt(ship, [0, 0], { horizontal: true });
        expect(gameboard.isDone()).toBe(false);
        gameboard.receiveAttack([0, 0]);
        expect(gameboard.isDone()).toBe(false);
        gameboard.receiveAttack([1, 0]);
        expect(gameboard.isDone()).toBe(false);
        gameboard.receiveAttack([2, 0]);
        expect(gameboard.isDone()).toBe(true);
    })
})

describe('Player API', () => {
    it('construction', () => expect(new Player('MyName')).toBeDefined())
    it('construction expectation', () => expect(() => new Player()).toThrow())
    it('factory humain', () => expect(Player.buildHumain('Player 1')).toBeDefined())
    it('factory computer', () => expect(Player.buildComputer('Player 1')).toBeDefined())
    it('can use boardgames', () => {
        let boardgame = GameBoard.From({ width: 3, height: 3 });
        const computer = Player.buildComputer('Player 1').using(boardgame).against(boardgame);
    });
    it('computer knows how to place its ship', () => {
        let gbPlayer1 = GameBoard.From({ width: 3, height: 3 });
        let gbPlayer2 = GameBoard.From({ width: 3, height: 3 });
        const computer = Player.buildComputer('Player 1').using(gbPlayer1).against(gbPlayer2);
        let ship1 = Ship.FromLength(3);
        let ship2 = Ship.FromLength(2);
        computer.placeShips([ship1, ship2]);
    })
    it('computer knows how to win', () => {
        let gbPlayer1 = GameBoard.From({ width: 3, height: 3 });
        let gbPlayer2 = GameBoard.From({ width: 3, height: 3 });
        let ship1 = Ship.FromLength(3);
        let ship2 = Ship.FromLength(2);
        gbPlayer2.placeAt(ship1, [0, 0]);
        gbPlayer2.placeAt(ship2, [0, 1]);
        let other = Player.buildComputer('Player 2').using(gbPlayer2);
        let computer = Player.buildComputer('Player 1').using(gbPlayer1).against(other);
        for (let i = 0; i < 9; i++) computer.playOnce();
        expect(gbPlayer2.isDone()).toBe(true);
    })
})

describe('Game API', () => {
    it('construction', () => expect(new Game()).toBeDefined())
    // it('construction expectation', () => expect(() => new Game()).toThrow())
    it('set players', () => {
        let game = new Game();
        game.setPlayer1(Player.buildComputer('Player 1'));
        game.setPlayer2(Player.buildComputer('Player 2'));
    })
    it('play the game', async () => {
        let gbPlayer1 = GameBoard.From({ width: 3, height: 3 });
        let gbPlayer2 = GameBoard.From({ width: 3, height: 3 });
        let ship0 = Ship.FromLength(3);
        let ship1 = Ship.FromLength(3);
        let ship2 = Ship.FromLength(2);
        gbPlayer1.placeAt(ship0, [0, 0]);
        gbPlayer2.placeAt(ship1, [0, 0]);
        gbPlayer2.placeAt(ship2, [0, 1]);
        let player1 = Player.buildComputer('Player 1').using(gbPlayer1);
        let player2 = Player.buildComputer('Player 2').using(gbPlayer2);

        let game = new Game();
        game.setPlayer1(player1);
        game.setPlayer2(player2);
        expect(await game.whoseTurn()).toBe(player1);
        expect(async () => await game.giveTurn(player2)).rejects.toThrow();
        game.giveTurn(player1);
        expect(await game.whoseTurn()).toBe(player2);
        expect(async () => game.giveTurn(player1)).rejects.toThrow();
        game.giveTurn(player2);
        expect(await game.whoseTurn()).toBe(player1);
        game.giveTurn(player1);
        expect(await game.whoseTurn()).toBe(player2);
        game.giveTurn(player2);
    })
    it('end the game', () => {
        let game = new Game();

        let gbPlayer1 = GameBoard.From({ width: 1, height: 1 });
        let gbPlayer2 = GameBoard.From({ width: 1, height: 1 });
        gbPlayer1.placeAt(Ship.FromLength(1), [0, 0]);
        gbPlayer2.placeAt(Ship.FromLength(1), [0, 0]);
        let player1 = Player.buildComputer('Player 1').using(gbPlayer1);
        let player2 = Player.buildComputer('Player 2').using(gbPlayer2);

        game.setPlayer1(player1);
        game.setPlayer2(player2);
        game.giveTurn(player1);
        expect(game.isDone()).toBe(true);
        expect(game.winner).toBe(player1);
    })
})