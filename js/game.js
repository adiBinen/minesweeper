'use strict'
var NORMAL = '<img src="img/normal.png" width=50>';
var DEAD = '<img src="img/dead.png" width=50>';
var VICROTY = '<img src="img/victory.png" width=50>';
var HINT = '<img src="img/hint.png">';

var gLevel = {
    SIZE: 6,
    MINES: 5
};
var gBoard;
var gGame = {
    isOn: false,
    shownCount: 0,
    markedCount: 0,
    isHintMode: false,
    startTime: 0,
    userScore: Infinity,
    timerInterval: 0
};

// Pieces Types
const MINE = '&#128163';
const MARK = '&#128681';
const CORRECT = '&#10004';
const WRONG = '&#128683';

// on load
function init() {
    gGame.isOn = false;
    gGame.isHintMode = false;
    gGame.shownCount = 0;
    gGame.markedCount = 0;
    gGame.startTime = Date.now();
    gGame.userScore = Infinity;

    if (gGame.timerInterval) {
        clearInterval(gGame.timerInterval);
    }

    gBoard = buildBoard();
    renderBoard(gBoard);

    // hide hints buttons before game starts
    let elHintsBtns = document.querySelectorAll('.btnHints');
    for (let i = 0; i < elHintsBtns.length; i++) {
        elHintsBtns[i].style.display = "none";
    }
    // show best score
    document.querySelector('.currTime').innerHTML = '';
    var bestScore = localStorage.getItem(`${gLevel.SIZE}`);
    var elBestScore = document.querySelector('.bestScore');
    if (!bestScore) elBestScore.innerHTML = 'no best score for this level yet';
    else elBestScore.innerHTML = `Best score is: ${bestScore}`;

    // init DOM marked cells count
    document.querySelector('.minesCount').innerHTML = gLevel.MINES;

    // init DOM level button default
    var elLevelButtons = document.querySelectorAll('.btnLevel');
    var selectedBtnCount = 0;
    for(var i = 0; i < elLevelButtons.length; i++) {
        var elCurrBtn = elLevelButtons[i];
        if (elCurrBtn.classList.contains('chosen-level')) {
            selectedBtnCount++;
        }
    }
    if (!selectedBtnCount) { // if all level buttons aren't selected
        elLevelButtons[1].classList.add('chosen-level'); // select deafult level
    }

    // init smiley
    normalSmiley();
}

function beginner(elLevelButton) {
    gLevel.SIZE = 4;
    gLevel.MINES = 2;
    clearLevelBtnStyle();
    elLevelButton.classList.add('chosen-level');
    init();
}

function medium(elLevelButton) {
    gLevel.SIZE = 6;
    gLevel.MINES = 5;
    clearLevelBtnStyle();
    elLevelButton.classList.add('chosen-level');
    init();
}
function expert(elLevelButton) {
    gLevel.SIZE = 8;
    gLevel.MINES = 15;
    clearLevelBtnStyle();
    elLevelButton.classList.add('chosen-level');
    init();
}

function clearLevelBtnStyle() {
    var elLevelButtons = document.querySelectorAll('.btnLevel');   
    for(var i = 0; i < elLevelButtons.length; i++) {
        var elCurrBtn = elLevelButtons[i];
        if (elCurrBtn.classList.contains('chosen-level')) {
            elCurrBtn.classList.remove('chosen-level');
        }
    }
}

function buildBoard() {
    // Builds the board
    var board = [];
    for (let i = 0; i < gLevel.SIZE; i++) {
        board[i] = [];
        for (var j = 0; j < gLevel.SIZE; j++) {
            var cell = {
                minesAroundCount: 0,
                isShown: false,
                isMine: false,
                isMarked: false
            };
            board[i][j] = cell;
        }
    }
    // Return the created board
    return board;
}

function renderBoard(board) {
    var strHtml = '';
    for (var i = 0; i < gLevel.SIZE; i++) {
        strHtml += '<tr>';
        for (var j = 0; j < gLevel.SIZE; j++) {
            var className = ((i + j) % 2 === 0) ? 'green' : 'darkGreen';
            var tdId = `cell-${i}-${j}`;
            strHtml += `<td id="${tdId}" class="${className}" 
            oncontextmenu="cellMarked(this, ${i}, ${j}, event)"
            onclick="cellClicked(${i},${j})">
            
                        </td>`
        }
        strHtml += '</tr>';
    }
    var elMat = document.querySelector('.game-board');
    elMat.innerHTML = strHtml;
}

function placeMinesAndNegs(idxI, idxJ) {
    // Set mines at random locations
    for (let i = 0; i < gLevel.MINES; i++) {
        var randCell = findRandomCell(idxI, idxJ);
        gBoard[randCell.i][randCell.j].isMine = true;
    }
    // Call setMinesNegsCount()
    setMinesNegsCount(gBoard);
}

// find random cell location to put mines
function findRandomCell(idxI, idxJ) {
    var emptyCells = [];
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard.length; j++) {
            if (idxI === i && idxJ === j) continue; // first clicked cell cant be a mine 
            var cell = gBoard[i][j];
            if (!cell.isMine) { //if there is no mine in the current cell
                var currCell = {
                    i: i,
                    j: j
                };
                emptyCells.push(currCell);
            }
        }
    }
    if (!emptyCells) return;
    var randIdx = getRandomIntInclusive(0, emptyCells.length - 1);
    return emptyCells[randIdx];
}

// set neighbors counter for each non-mine cell
function setMinesNegsCount(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[0].length; j++) {
            var currCell = board[i][j];
            if (!currCell.isMine) {
                var minesCount = countNeighbors(i, j, gBoard);
                currCell.minesAroundCount = minesCount;
            }
        }
    }
}

function countNeighbors(cellI, cellJ, mat) {
    var neighborsCount = 0;
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= mat.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (i === cellI && j === cellJ) continue;
            if (j < 0 || j >= mat[i].length) continue;
            var currNeighbor = mat[i][j];
            if (currNeighbor.isMine) neighborsCount++;
        }
    }
    return neighborsCount;
}

function cellClicked(i, j) {
    if (gGame.isHintMode) {
        hintModeCellClicked(i, j);
        return;
    }
    var cell = gBoard[i][j];
    if (cell.isMarked || cell.isShown) return;
    if (!gGame.isOn) { // if its the first click
        placeMinesAndNegs(i, j);
        console.table(gBoard);
        // init hints buttons
        let elHintsBtns = document.querySelectorAll('.btnHints');
        for (let i = 0; i < elHintsBtns.length; i++) {
            elHintsBtns[i].style.display = "inline";
        }
        setTimer();
        gGame.isOn = true;
    }

    showCell(i, j);
    if (cell.isMine) {
        deadSmiley();
        showAllMines();
    } else if (cell.minesAroundCount === 0) { // if there are no neighbors - expand        
        expandShown(gBoard, i, j);

    }
    if (checkVictory()) {
        victory();
    }
}

// When user clicks a cell with no mines around, open also its neighbors. (recursion)
function expandShown(board, i, j) {
    for (let idxI = i - 1; idxI <= i + 1; idxI++) {
        if (!gBoard[idxI]) continue;
        for (let idxJ = j - 1; idxJ <= j + 1; idxJ++) {
            if (!gBoard[idxI][idxJ]) continue;
            var cell = board[idxI][idxJ];
            if (!cell.minesAroundCount && !cell.isShown && !cell.isMarked) {
                showCell(idxI, idxJ);
                expandShown(board, idxI, idxJ);
            } else if (!cell.isMine && !cell.isShown) {
                showCell(idxI, idxJ);
            }
        }
    }
}

function cellMarked(elCell, i, j, ev) {
    ev.preventDefault();
    if (gGame.isHintMode) return;

    var cell = gBoard[i][j];
    if (cell.isShown) return;
    var elMarkedCounter = document.querySelector('.minesCount');
    if (cell.isMarked) {
        elCell.innerHTML = '';
        cell.isMarked = false;
        gGame.markedCount--;
        elMarkedCounter.innerHTML = gLevel.MINES - gGame.markedCount;
    } else {
        elCell.innerHTML = MARK;
        cell.isMarked = true;
        gGame.markedCount++;
        elMarkedCounter.innerHTML = gLevel.MINES - gGame.markedCount;
        if (checkVictory()) victory();
    }
}

function showCell(i, j) {
    let elCell = document.querySelector(`#cell-${i}-${j}`);
    let cell = gBoard[i][j];
    if (cell.isMarked) return;
    elCell.classList.add('shown');
    cell.isShown = true;
    if (cell.isMine) elCell.innerHTML = MINE;
    else if (!cell.minesAroundCount) elCell.innerHTML = '';
    else elCell.innerHTML = cell.minesAroundCount;
    gGame.shownCount++;
    document.querySelector('.shownCount').innerHTML = gGame.shownCount;
}

function showAllMines() {
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard.length; j++) {
            var cell = gBoard[i][j];
            var elCell = document.querySelector(`#cell-${i}-${j}`);

            if (cell.isMine && cell.isMarked) {
                cell.isShown = true;
                elCell.innerHTML = CORRECT;
            } else if (cell.isMine && !cell.isMarked) {
                cell.isShown = true;
                elCell.innerHTML = MINE;
            } else if (!cell.isMine && cell.isMarked) {
                cell.isShown = true;
                elCell.innerHTML = WRONG;
            }
        }
    }
    gameOver();
}

function checkVictory() {
    var isVictory = true;
    for (let i = 0; i < gBoard.length; i++) {
        for (let j = 0; j < gBoard.length; j++) {
            var cell = gBoard[i][j];
            if ((!cell.isMine && !cell.isShown)) { //if regular cell (not mine cell) is not shown   
                isVictory = false;
                break;
            }
        }
    }
    return isVictory;
}

function victory() {
    victorySmiley();
    gameOver();
    var bestScore = localStorage.getItem(`${gLevel.SIZE}`);
    if (!bestScore) { // if local storage for the current level is empty
        localStorage.setItem(`${gLevel.SIZE}`, gGame.userScore);
    } else if (bestScore > gGame.userScore) {
        localStorage.setItem(`${gLevel.SIZE}`, gGame.userScore);
        document.querySelector('.bestScore').innerHTML = `you are the best score!`;
    }
}

function gameOver() {
    gGame.isOn = false;
    clearInterval(gGame.timerInterval);
    var elBoard = document.querySelectorAll('td');
    for (let i = 0; i < elBoard.length; i++) {
        elBoard[i].classList.add('disable-me');
    }
}

function setTimer() {
    gGame.timerInterval = setInterval(function () {
        gGame.userScore = parseInt((Date.now() - gGame.startTime) / 1000);
        document.querySelector('.currTime').innerHTML = `your score: ${gGame.userScore} seconds`;
    }, 1000);
}

// when hint button is clicked
function handleHints(elBtnClicked) {
    if (!gGame.isOn) return;
    if (!gGame.isHintMode) {
        gGame.isHintMode = true;
    }
    elBtnClicked.style.display = 'none';

    // select all relevant cells (all not shown cells)
    for (let i = 0; i < gLevel.SIZE; i++) {
        for (let j = 0; j < gLevel.SIZE; j++) {
            let elCell = document.querySelector(`#cell-${i}-${j}`);
            if (gBoard[i][j].isShown) continue;
            elCell.classList.add('hintSelect');
        }
    }
}

// when user clicked on a cell in hint mode
function hintModeCellClicked(i, j) {
    var hintShownCells = [];
    let elCell = document.querySelector(`#cell-${i}-${j}`);
    if (!elCell.classList.contains('hintSelect')) return;
    for (let idxI = i - 1; idxI <= i + 1; idxI++) {
        for (let idxJ = j - 1; idxJ <= j + 1; idxJ++) {
            if (idxI < 0 || idxI >= gLevel.SIZE || idxJ < 0 || idxJ >= gLevel.SIZE) continue;
            var cell = gBoard[idxI][idxJ];
            if (cell.isShown) continue;
            showCell(idxI, idxJ);
            hintShownCells.push({ i: idxI, j: idxJ }); // keep all showed cell in order to unreveal them later
        }
    }
    // unreveal cells after 1 sec
    setTimeout(function closeHintCells() {
        for (let i = 0; i < hintShownCells.length; i++) {
            let idxI = hintShownCells[i].i;
            let idxJ = hintShownCells[i].j;
            var elHintCell = document.querySelector(`#cell-${idxI}-${idxJ}`);
            elHintCell.innerHTML = ``;
            gBoard[idxI][idxJ].isShown = false;
            if (elHintCell.classList.contains('shown')) {
                elHintCell.classList.remove('shown');
                gGame.shownCount--;
                document.querySelector('.shownCount').innerHTML = gGame.shownCount;
            }
        }

        // remove the indication of the user when hint mode ends 
        for (let i = 0; i < gLevel.SIZE; i++) {
            for (let j = 0; j < gLevel.SIZE; j++) {
                var elHintCell = document.querySelector(`#cell-${i}-${j}`);
                if (elHintCell.classList.contains('hintSelect')) {
                    elHintCell.classList.remove('hintSelect');
                }
            }
        }
        gGame.isHintMode = false;
    }, 1000);
}

/* smiles */
function normalSmiley() {
    let elSmile = document.querySelector('.smiley');
    elSmile.innerHTML = NORMAL;
}
function deadSmiley() {
    let elSmile = document.querySelector('.smiley');
    elSmile.innerHTML = DEAD;
}
function victorySmiley() {
    let elSmile = document.querySelector('.smiley');
    elSmile.innerHTML = VICROTY;
}